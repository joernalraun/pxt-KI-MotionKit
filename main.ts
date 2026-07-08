/**
 * KI-Linienfolger für Calliope mini 3 + MotionKit.
 *
 * Ein kleines neuronales Netz (Mehrschicht-Perzeptron), das direkt auf dem
 * Calliope trainiert wird - ohne PC, ohne ML4F. Drei Phasen: Sammeln, Lernen,
 * Fahren. Zwei Modi (einfach / mit Gedächtnis) und zwei Block-Ebenen
 * (Einfach / Werkstatt).
 *
 * Hardware-Anbindung erfolgt ausschließlich über die drei Adapter-Funktionen
 * leseLinks(), leseRechts() und fahre() - nur dort wird die MotionKit-
 * Erweiterung (Namespace maqueen) benötigt.
 *
 * Sprachen: Deutsch ist die Standardsprache (Blocktexte hier). Übersetzungen
 * (en, es, fr, it, el, nl) inkl. Gruppennamen liegen in _locales/<code>/
 * ki-linienfolger-strings.json.
 */

//% weight=100 color="#00A15A" icon="" block="KI Linienfolger"
//% groups="['Einfach', 'Werkstatt', 'Anzeige', 'Einstellungen']"
namespace kiLinie {

    export enum Modus {
        //% block="einfach (2 Sensoren)"
        Einfach = 0,
        //% block="mit Gedächtnis"
        Gedaechtnis = 1
    }

    export enum Seite {
        //% block="links"
        Links = 0,
        //% block="rechts"
        Rechts = 1
    }

    let modus = Modus.Einfach
    let histLen = 3
    let ni = 2
    let nh = 5
    const no = 2
    let lernrate = 0.3
    let grundTempo = 40

    let w1: number[][] = []
    let w2: number[][] = []
    let xVec: number[] = []
    let hVec: number[] = []
    let yVec: number[] = []

    let beispieleX: number[][] = []
    let beispieleD: number[][] = []
    let historie: number[] = []

    let letzterFehler = 1
    let initialisiert = false

    // ---------------------------------------------------------------
    // Hardware-Adapter - einzige Stelle mit MotionKit-Bezug (maqueen).
    // ---------------------------------------------------------------
    function leseLinks(): boolean {
        return maqueen.readPatrol(maqueen.Patrol.PatrolLeft, maqueen.Brightness.Dark)
    }
    function leseRechts(): boolean {
        return maqueen.readPatrol(maqueen.Patrol.PatrolRight, maqueen.Brightness.Dark)
    }
    function fahre(links: number, rechts: number): void {
        let sl = Math.round(grundTempo * links / 0.9)
        let sr = Math.round(grundTempo * rechts / 0.9)
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, sl)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, sr)
    }

    // ---------------------------------------------------------------
    // Netz-Mathematik.
    // ---------------------------------------------------------------
    function sig(a: number): number {
        if (a < -30) return 0
        if (a > 30) return 1
        return 1 / (1 + Math.exp(-a))
    }

    function berechneNi(): void {
        ni = modus == Modus.Gedaechtnis ? 2 * histLen : 2
    }

    function initNetz(): void {
        berechneNi()
        w1 = []
        for (let i = 0; i <= ni; i++) {
            let row: number[] = []
            for (let j = 0; j < nh; j++) row.push(Math.random() * 2 - 1)
            w1.push(row)
        }
        w2 = []
        for (let j = 0; j <= nh; j++) {
            let row: number[] = []
            for (let k = 0; k < no; k++) row.push(Math.random() * 2 - 1)
            w2.push(row)
        }
        xVec = []
        for (let i = 0; i <= ni; i++) xVec.push(0)
        hVec = []
        for (let j = 0; j <= nh; j++) hVec.push(0)
        yVec = []
        for (let k = 0; k < no; k++) yVec.push(0)
        historie = []
        for (let i = 0; i < ni; i++) historie.push(0.1)
        letzterFehler = 1
        initialisiert = true
    }

    function vorwaerts(inp: number[]): void {
        for (let i = 0; i < ni; i++) xVec[i] = i < inp.length ? inp[i] : 0
        xVec[ni] = 1
        for (let j = 0; j < nh; j++) {
            let s = 0
            for (let i = 0; i <= ni; i++) s += w1[i][j] * xVec[i]
            hVec[j] = sig(s)
        }
        hVec[nh] = 1
        for (let k = 0; k < no; k++) {
            let s = 0
            for (let j = 0; j <= nh; j++) s += w2[j][k] * hVec[j]
            yVec[k] = sig(s)
        }
    }

    function rueckwaerts(ziel: number[]): number {
        let maxErr = 0
        let errH: number[] = []
        for (let j = 0; j <= nh; j++) errH.push(0)
        for (let k = 0; k < no; k++) {
            let diff = ziel[k] - yVec[k]
            if (Math.abs(diff) > maxErr) maxErr = Math.abs(diff)
            let delta = diff * yVec[k] * (1 - yVec[k])
            for (let j = 0; j <= nh; j++) {
                errH[j] += delta * w2[j][k]
                w2[j][k] += lernrate * delta * hVec[j]
            }
        }
        for (let j = 0; j < nh; j++) {
            let deltaH = errH[j] * hVec[j] * (1 - hVec[j])
            for (let i = 0; i <= ni; i++) w1[i][j] += lernrate * deltaH * xVec[i]
        }
        return maxErr
    }

    function eineEpoche(): number {
        let maxErr = 0
        for (let p = 0; p < beispieleX.length; p++) {
            vorwaerts(beispieleX[p])
            let e = rueckwaerts(beispieleD[p])
            if (e > maxErr) maxErr = e
        }
        return maxErr
    }

    // ---------------------------------------------------------------
    // Regel-Lehrer und Eingabe-Aufbereitung.
    // ---------------------------------------------------------------
    function sensorWert(b: boolean): number {
        return b ? 0.9 : 0.1
    }

    function regelZiel(l: boolean, r: boolean): number[] {
        // Klassischer Linienfolger als "Lehrer" für die Beispiele.
        if (l && !r) return [0.1, 0.9]   // Linie links  -> nach links
        if (r && !l) return [0.9, 0.1]   // Linie rechts -> nach rechts
        return [0.9, 0.9]                // sonst geradeaus
    }

    function baueEingabe(l: boolean, r: boolean): number[] {
        let lv = sensorWert(l)
        let rv = sensorWert(r)
        if (modus == Modus.Einfach) return [lv, rv]
        historie.shift()
        historie.shift()
        historie.push(lv)
        historie.push(rv)
        return historie.slice(0)
    }

    function zeigePfeil(l: number, r: number): void {
        // Konfidenz = wie deutlich unterscheiden sich die beiden Ausgaben.
        // Ein blasser Pfeil bedeutet: das Netz ist unsicher.
        let konf = Math.abs(l - r)
        led.setBrightness(Math.min(255, Math.round(konf * 400) + 40))
        if (l > r + 0.15) basic.showArrow(ArrowNames.East)
        else if (r > l + 0.15) basic.showArrow(ArrowNames.West)
        else basic.showArrow(ArrowNames.North)
    }

    function r2(x: number): number {
        return Math.round(x * 100) / 100
    }

    // Zeigt über die RGB-LED, ob ein Neuron gerade "feuert".
    // Hinweis: basic.setLedColor ist Calliope-spezifisch - in MakeCode prüfen.
    function zeigeFeuern(aktiv: boolean): void {
        basic.setLedColor(aktiv ? 0x00ff00 : 0xff0000)
    }

    // ===============================================================
    // Einfach - je ein Block pro Phase.
    // ===============================================================

    //% blockId=kilinie_sammle block="fahre der Regel folgend und merke ein Beispiel"
    //% weight=100 group="Einfach"
    export function sammleSchritt(): void {
        if (!initialisiert) initNetz()
        let l = leseLinks()
        let r = leseRechts()
        let inp = baueEingabe(l, r)
        let ziel = regelZiel(l, r)
        beispieleX.push(inp)
        beispieleD.push(ziel)
        fahre(ziel[0], ziel[1])
        led.plotBarGraph(beispieleX.length, 60)
        basic.pause(100)
    }

    //% blockId=kilinie_trainiere block="trainiere das Netz %schritte Schritte"
    //% schritte.defl=2000 weight=90 group="Einfach"
    export function trainiere(schritte: number): void {
        if (!initialisiert) initNetz()
        if (beispieleX.length == 0) {
            basic.showIcon(IconNames.No)
            return
        }
        led.setBrightness(255)
        let takt = Math.max(1, Math.idiv(schritte, 25))
        for (let s = 0; s < schritte; s++) {
            letzterFehler = eineEpoche()
            if (s % takt == 0) {
                led.plotBarGraph(s, schritte)
                // Fehlerkurve für den MakeCode-Datenplotter am Rechner.
                serial.writeValue("fehler", letzterFehler)
            }
        }
        led.plotBarGraph(schritte, schritte)
        basic.showIcon(IconNames.Yes)
    }

    //% blockId=kilinie_fahre block="fahre mit dem Netz"
    //% weight=80 group="Einfach"
    export function fahreSchritt(): void {
        if (!initialisiert) return
        let l = leseLinks()
        let r = leseRechts()
        let inp = baueEingabe(l, r)
        vorwaerts(inp)
        fahre(yVec[0], yVec[1])
        zeigePfeil(yVec[0], yVec[1])
        basic.pause(80)
    }

    //% blockId=kilinie_reset block="Netz und Beispiele zurücksetzen"
    //% weight=70 group="Einfach"
    export function zuruecksetzen(): void {
        beispieleX = []
        beispieleD = []
        initNetz()
        maqueen.motorStop(maqueen.Motors.All)
        basic.clearScreen()
    }

    // ===============================================================
    // Werkstatt - die Lernschleife selbst bauen.
    // ===============================================================

    //% blockId=kilinie_merke block="merke Beispiel für Sensor links %l rechts %r"
    //% weight=60 group="Werkstatt"
    export function merkeBeispiel(l: boolean, r: boolean): void {
        if (!initialisiert) initNetz()
        beispieleX.push(baueEingabe(l, r))
        beispieleD.push(regelZiel(l, r))
    }

    //% blockId=kilinie_schritt block="ein Trainingsschritt"
    //% weight=55 group="Werkstatt"
    export function einTrainingsschritt(): number {
        if (!initialisiert) initNetz()
        if (beispieleX.length == 0) return 1
        letzterFehler = eineEpoche()
        return letzterFehler
    }

    //% blockId=kilinie_vorhersage block="Vorhersage Motor %seite für Sensor links %l rechts %r"
    //% weight=50 group="Werkstatt"
    export function vorhersage(seite: Seite, l: boolean, r: boolean): number {
        if (!initialisiert) initNetz()
        vorwaerts(baueEingabe(l, r))
        return seite == Seite.Links ? yVec[0] : yVec[1]
    }

    //% blockId=kilinie_anzahl block="Anzahl Beispiele"
    //% weight=45 group="Werkstatt"
    export function anzahlBeispiele(): number {
        return beispieleX.length
    }

    //% blockId=kilinie_fehler block="aktueller Fehler"
    //% weight=40 group="Werkstatt"
    export function aktuellerFehler(): number {
        return letzterFehler
    }

    // ===============================================================
    // Anzeige - das Netz sichtbar machen.
    // ===============================================================

    //% blockId=kilinie_zeigenetz block="zeige Netz-Zustand"
    //% weight=38 group="Anzeige"
    export function zeigeNetzZustand(): void {
        if (!initialisiert) initNetz()
        // aktuelle Sensorlage durchs Netz rechnen (Roboter dazu in der Hand halten).
        let l = leseLinks()
        let r = leseRechts()
        vorwaerts(baueEingabe(l, r))
        led.setBrightness(255)
        basic.clearScreen()
        // Spalte 0 = Eingaben, Spalte 2 = verborgene Neuronen, Spalte 4 = Ausgaben.
        let nin = Math.min(ni, 5)
        for (let i = 0; i < nin; i++) led.plotBrightness(0, i, Math.round(xVec[i] * 255))
        let nhd = Math.min(nh, 5)
        for (let j = 0; j < nhd; j++) led.plotBrightness(2, j, Math.round(hVec[j] * 255))
        led.plotBrightness(4, 1, Math.round(yVec[0] * 255))
        led.plotBrightness(4, 3, Math.round(yVec[1] * 255))
    }

    //% blockId=kilinie_zeigeneuron block="öffne Neuron %index"
    //% index.defl=0 index.min=0 weight=34 group="Anzeige"
    export function zeigeNeuron(index: number): void {
        if (!initialisiert) initNetz()
        if (index < 0 || index >= nh) return
        // aktuelle Aktivierung dieses Neurons bestimmen.
        let l = leseLinks()
        let r = leseRechts()
        vorwaerts(baueEingabe(l, r))
        // stärkstes eingehendes Gewicht als Maßstab für die Helligkeit.
        let maxAbs = 0.0001
        for (let i = 0; i <= ni; i++) {
            if (Math.abs(w1[i][index]) > maxAbs) maxAbs = Math.abs(w1[i][index])
        }
        led.setBrightness(255)
        basic.clearScreen()
        // Spalte 0: Beträge der eingehenden Gewichte (inkl. Bias), gedeckelt auf 5.
        let n = Math.min(ni + 1, 5)
        for (let i = 0; i < n; i++) {
            led.plotBrightness(0, i, Math.round(Math.abs(w1[i][index]) / maxAbs * 255))
        }
        // Mitte: aktuelle Aktivierung des Neurons.
        led.plotBrightness(2, 2, Math.round(hVec[index] * 255))
        // RGB-LED: feuert das Neuron gerade (grün) oder ist es ruhig (rot)?
        zeigeFeuern(hVec[index] > 0.5)
        // Genaue, vorzeichenbehaftete Werte zusätzlich seriell ausgeben.
        let z = "Neuron " + index + " Gewichte:"
        for (let i = 0; i <= ni; i++) z = z + " " + r2(w1[i][index])
        serial.writeLine(z)
    }

    //% blockId=kilinie_gibaus block="gib Netz seriell aus"
    //% weight=30 group="Anzeige"
    export function gibNetzAus(): void {
        if (!initialisiert) initNetz()
        serial.writeLine("--- Netz ---")
        serial.writeLine("Fehler: " + r2(letzterFehler) + "  Beispiele: " + beispieleX.length)
        for (let j = 0; j < nh; j++) {
            let z = "H" + j + " <-"
            for (let i = 0; i <= ni; i++) z = z + " " + r2(w1[i][j])
            serial.writeLine(z)
        }
        for (let k = 0; k < no; k++) {
            let z = "Y" + k + " <-"
            for (let j = 0; j <= nh; j++) z = z + " " + r2(w2[j][k])
            serial.writeLine(z)
        }
    }

    // ===============================================================
    // Einstellungen.
    // ===============================================================

    //% blockId=kilinie_modus block="setze Modus auf %m"
    //% weight=35 group="Einstellungen"
    export function setzeModus(m: Modus): void {
        modus = m
        beispieleX = []
        beispieleD = []
        initNetz()
    }

    //% blockId=kilinie_neuronen block="setze versteckte Neuronen auf %n"
    //% n.defl=5 n.min=2 n.max=12 weight=30 group="Einstellungen"
    export function setzeVersteckteNeuronen(n: number): void {
        nh = n
        initNetz()
    }

    //% blockId=kilinie_lernrate block="setze Lernrate auf %x"
    //% x.defl=0.3 weight=25 group="Einstellungen"
    export function setzeLernrate(x: number): void {
        lernrate = x
    }

    //% blockId=kilinie_hist block="setze Gedächtnis-Länge auf %n Schritte"
    //% n.defl=3 n.min=1 n.max=6 weight=20 group="Einstellungen"
    export function setzeHistorieLaenge(n: number): void {
        histLen = n
        if (modus == Modus.Gedaechtnis) {
            beispieleX = []
            beispieleD = []
            initNetz()
        }
    }

    //% blockId=kilinie_tempo block="setze Grundtempo auf %v"
    //% v.defl=40 v.min=0 v.max=255 weight=15 group="Einstellungen"
    export function setzeGrundtempo(v: number): void {
        grundTempo = v
    }
}
