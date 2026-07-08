// Beispielverwendung - wird nicht mitkompiliert, wenn die Erweiterung
// in einem anderen Projekt genutzt wird.

// --- Ebene "Einfach" -------------------------------------------------
// A gedrückt halten: Roboter fährt der Regel folgend und sammelt Beispiele.
input.onButtonPressed(Button.A, function () {
    kiLinie.sammleSchritt()
})

// B: einmal trainieren (blockiert kurz, zeigt Fortschritt, dann Haken).
input.onButtonPressed(Button.B, function () {
    kiLinie.trainiere(2000)
})

// A+B: mit dem gelernten Netz fahren.
input.onButtonPressed(Button.AB, function () {
    basic.forever(function () {
        kiLinie.fahreSchritt()
    })
})

// --- Netz sichtbar machen -------------------------------------------
// Schütteln: Roboter in der Hand halten und dem Netz beim Denken zusehen
// (drei Schichten als Helligkeit auf der Matrix).
input.onGesture(Gesture.Shake, function () {
    kiLinie.zeigeNetzZustand()
})

// Logo berühren: ein einzelnes verborgenes Neuron öffnen.
// input.onLogoEvent(TouchButtonEvent.Pressed, function () {
//     kiLinie.zeigeNeuron(0)
// })

// Alle Gewichte in die serielle Konsole schreiben.
// kiLinie.gibNetzAus()

// --- Ebene "Werkstatt" (Schüler bauen die Lernschleife selbst) -------
// kiLinie.setzeModus(kiLinie.Modus.Gedaechtnis)
// kiLinie.setzeVersteckteNeuronen(6)
// kiLinie.setzeLernrate(0.3)
//
// for (let i = 0; i < 3000; i++) {
//     let fehler = kiLinie.einTrainingsschritt()
//     led.plotBarGraph(1000 - Math.round(fehler * 1000), 1000)
// }
