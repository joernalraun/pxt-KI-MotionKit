# KI-Linienfolger (MakeCode-Erweiterung)

Ein kleines neuronales Netz, das **direkt auf dem Calliope mini 3 trainiert
wird** – ganz ohne PC.

## Idee: drei Phasen

1. **Sammeln** – das MotionKit fährt einem klassischen Regel-„Lehrer" folgend und
   merkt sich Beispiele (Sensorlage → passende Motoraktion). Die LED-Matrix
   zeigt als Balken, wie viele Beispiele gesammelt wurden.
2. **Lernen** – dasselbe Netz wird auf dem Calliope mini trainiert (Backpropagation).
   Die LED-Matrix zeigt den Fortschritt, am Ende einen Haken.
3. **Fahren** – das Netz steuert das MotionKit selbst. Ein Pfeil zeigt live die
   Entscheidung (links / geradeaus / rechts).

Der Zyklus ist beliebig wiederholbar (mehr sammeln, neu trainieren).

## Zwei Modi (umschaltbar)

- **einfach** – Eingabe = die zwei Liniensensoren. Das Netz lernt die 4
  möglichen Zustände und ahmt damit den Regel-Algorithmus nach.
- **mit Gedächtnis** – Eingabe = die letzten *N* Sensorzustände. Damit kann das
  Netz etwas, das eine feste Regel schlecht kann (z. B. reagieren, wenn die
  Linie kurz verschwindet).

## Zwei Block-Ebenen

- **Einfach**: `sammleSchritt`, `trainiere`, `fahreSchritt`, `zuruecksetzen`.
- **Werkstatt** (Blick in die Blackbox): `merkeBeispiel`, `einTrainingsschritt`
  (gibt den Fehler zurück), `vorhersage`, `anzahlBeispiele`, `aktuellerFehler`.
- **Anzeige** (Netz sichtbar machen): `zeigeNetzZustand`, `zeigeNeuron`,
  `gibNetzAus`.
- **Einstellungen**: Modus, versteckte Neuronen, Lernrate, Gedächtnis-Länge,
  Grundtempo.

Siehe `test.ts` für ein vollständiges Beispiel.

## Das Netz sichtbar machen

- **`zeigeNetzZustand`** – malt das Netz als drei Spalten auf die 5×5-Matrix:
  Spalte 0 = Eingaben, Spalte 2 = verborgene Neuronen, Spalte 4 = Ausgaben. Die
  Helligkeit jeder LED ist die aktuelle Aktivierung. Ideal: Roboter in der Hand
  halten, über verschiedene Sensorlagen bewegen und dem Netz beim „Denken"
  zusehen.
- **`zeigeNeuron`** – „öffnet" ein verborgenes Neuron: die Beträge seiner
  eingehenden Gewichte als Helligkeit (Spalte 0), seine aktuelle Aktivierung in
  der Mitte, und die RGB-LED zeigt grün/rot, ob es gerade feuert. Die genauen,
  vorzeichenbehafteten Gewichte kommen zusätzlich über `serial`.
- **`gibNetzAus`** – schreibt alle Gewichte + Fehler in die serielle Konsole.
  Beim Trainieren wird außerdem automatisch `fehler` gesendet → im MakeCode-
  **Datenplotter** sieht man die Fehlerkurve live sinken.
- Der Fahr-Pfeil ist zusätzlich **konfidenz-abhängig hell**: ein blasser Pfeil
  heißt „das Netz ist unsicher".

Gerechnet wird alles auf dem Calliope – der Rechner dient bei `serial` nur als
Anzeige. `basic.setLedColor` (RGB-LED) ist Calliope-spezifisch; in MakeCode
prüfen, falls eine andere Ziel-Version genutzt wird.


## Hinweis

Die Liniensensoren sind **digital** (nur 0/1) → im einfachen Modus gibt es nur
4 Eingabezustände. Das Netz *imitiert* dann den Regel-Algorithmus. Das ist
gewollt und die zentrale Frage: **„Fährt das Netz besser – oder ahmt es nur nach?
Wann lohnt sich KI überhaupt?"**
Der Modus *mit Gedächtnis* zeigt, wann Lernen tatsächlich mehr kann als eine feste Regel.


MIT License.
