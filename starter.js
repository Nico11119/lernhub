// ===================== LernHub – Lerninhalte =====================
// Startinhalte – werden nur beim allerersten Start in deinen Datenordner übernommen.
// Danach verwaltest du Fächer, Lernzettel und Fragen direkt in der App.
window.STARTER_SUBJECTS = [
  {
    id: 'mathe', name: 'Mathe', color: '#ff6b2c',
    desc: 'Potenzen, Wurzeln und Funktionen',
    topics: [
      { id: 'pot', name: 'Potenzen', cards: [
        ['aᵐ · aⁿ = ?', 'aᵐ⁺ⁿ'],
        ['aᵐ : aⁿ = ?', 'aᵐ⁻ⁿ'],
        ['(aᵐ)ⁿ = ?', 'aᵐ·ⁿ'],
        ['a⁰ = ? (a ≠ 0)', '1'],
        ['a⁻ⁿ = ?', '1 / aⁿ'],
        ['2¹⁰ = ?', '1024']
      ]},
      { id: 'wur', name: 'Wurzeln', cards: [
        ['√a als Potenz geschrieben', 'a^(1/2)'],
        ['n-te Wurzel aus aᵐ als Potenz', 'a^(m/n)'],
        ['√(a · b) = ?', '√a · √b'],
        ['√72 vereinfacht', '6√2'],
        ['∛27 = ?', '3']
      ]},
      { id: 'fun', name: 'Eigenschaften von Funktionen', cards: [
        ['Was ist eine Nullstelle?', 'Stelle x, an der f(x) = 0 ist'],
        ['Was gibt k bei f(x) = kx + d an?', 'Die Steigung'],
        ['Was gibt d bei f(x) = kx + d an?', 'Den y-Achsenabschnitt'],
        ['Was ist die Definitionsmenge?', 'Alle x-Werte, die man einsetzen darf'],
        ['Was ist die Wertemenge?', 'Alle y-Werte, die f annimmt'],
        ['Wann ist f streng monoton steigend?', 'Aus x₁ < x₂ folgt f(x₁) < f(x₂)']
      ]}
    ]
  },
  {
    id: 'deutsch', name: 'Deutsch', color: '#6c9cff',
    desc: 'Beistrichregeln, Satzarten, Satzglieder',
    topics: [
      { id: 'bei', name: 'Beistrichregeln', cards: [
        ['Beistrich vor „dass“?', 'Ja, der Nebensatz wird abgetrennt'],
        ['Beistrich vor „und“ zwischen zwei Hauptsätzen?', 'Nicht verpflichtend'],
        ['Aufzählung ohne „und“/„oder“', 'Glieder mit Beistrich trennen'],
        ['Eingeschobener Nebensatz', 'Vorne und hinten Beistrich'],
        ['Apposition („Wien, die Hauptstadt, …“)', 'Wird mit Beistrichen eingeschlossen']
      ]},
      { id: 'sart', name: 'Satzarten', cards: [
        ['Aussagesatz – Stellung des Verbs?', 'Verb an 2. Stelle'],
        ['Entscheidungsfrage – Stellung des Verbs?', 'Verb an 1. Stelle, Antwort Ja/Nein'],
        ['Ergänzungsfrage', 'Beginnt mit einem Fragewort (W-Frage)'],
        ['Aufforderungssatz', 'Verb im Imperativ an 1. Stelle']
      ]},
      { id: 'hns', name: 'Haupt- und Nebensätze', cards: [
        ['Erkennungsmerkmal eines Nebensatzes', 'Das gebeugte Verb steht am Ende'],
        ['Was ist ein Satzgefüge?', 'Hauptsatz + mindestens ein Nebensatz'],
        ['Was ist eine Satzreihe?', 'Mindestens zwei Hauptsätze'],
        ['Kann ein Nebensatz allein stehen?', 'Nein, er hängt vom Hauptsatz ab']
      ]},
      { id: 'sgl', name: 'Satzglieder', cards: [
        ['Wie erfragt man das Subjekt?', 'Wer oder was?'],
        ['Wie erfragt man das Akkusativobjekt?', 'Wen oder was?'],
        ['Wie erfragt man das Dativobjekt?', 'Wem?'],
        ['Wie erfragt man das Genitivobjekt?', 'Wessen?'],
        ['Was ist das Prädikat?', 'Die Verbform(en) des Satzes'],
        ['Womit bestimmt man Satzglieder?', 'Mit der Umstellprobe']
      ]}
    ]
  },
  {
    id: 'sytb', name: 'SYTB', color: '#8fd16a',
    desc: 'Debian/Linux – Woche 1 bis 9',
    topics: [
      { id: 'vm', name: 'VMs & Installation', cards: [
        ['Was ist ein Hypervisor?', 'Software, die virtuelle Maschinen verwaltet'],
        ['Beispiel für einen Typ-2-Hypervisor', 'VirtualBox'],
        ['Paketmanager unter Debian', 'apt'],
        ['Paketlisten aktualisieren', 'apt update'],
        ['Installierte Pakete aktualisieren', 'apt upgrade']
      ]},
      { id: 'fs', name: 'Dateisystem', cards: [
        ['Wurzelverzeichnis', '/'],
        ['Home-Verzeichnis von root', '/root'],
        ['Wo liegen Konfigurationsdateien?', '/etc'],
        ['Womit beginnt ein absoluter Pfad?', 'Mit /'],
        ['Verzeichnis wechseln', 'cd'],
        ['Inhalt inkl. versteckter Dateien auflisten', 'ls -la']
      ]},
      { id: 'rechte', name: 'Rechte', cards: [
        ['chmod 755 bedeutet', 'rwxr-xr-x'],
        ['chmod 644 bedeutet', 'rw-r--r--'],
        ['Wofür steht das Recht w?', 'Schreiben'],
        ['Zahlenwert von r', '4'],
        ['Besitzer einer Datei ändern', 'chown']
      ]},
      { id: 'tools', name: 'find, grep & tar', cards: [
        ['Datei nach Namen suchen', 'find / -name "datei"'],
        ['Text in Dateien suchen', 'grep'],
        ['grep ohne Groß-/Kleinschreibung', 'grep -i'],
        ['gz-Archiv erstellen', 'tar -czf archiv.tar.gz ordner'],
        ['gz-Archiv entpacken', 'tar -xzf archiv.tar.gz']
      ]},
      { id: 'ssh', name: 'SSH', cards: [
        ['Standard-Port von SSH', '22'],
        ['Per SSH verbinden', 'ssh benutzer@host'],
        ['Schlüsselpaar erzeugen', 'ssh-keygen'],
        ['Public Key auf den Server kopieren', 'ssh-copy-id benutzer@host']
      ]}
    ]
  },
  {
    id: 'sytg', name: 'SYTG', color: '#e9c04b',
    desc: 'PC-Hardware, Schnittstellen, RAID',
    topics: [
      { id: 'mc', name: 'Mikrocomputer', cards: [
        ['Von-Neumann: Wo liegen Programme und Daten?', 'Im selben Speicher'],
        ['Hauptbestandteile der CPU', 'Steuerwerk, Rechenwerk, Register'],
        ['Was macht die ALU?', 'Arithmetische und logische Operationen'],
        ['Die drei Busse', 'Daten-, Adress- und Steuerbus']
      ]},
      { id: 'mb', name: 'Hauptplatine', cards: [
        ['Aufgabe des Chipsatzes', 'Steuert den Datenaustausch zwischen CPU, RAM und Peripherie'],
        ['Verbreitetster Formfaktor', 'ATX'],
        ['Was ist BIOS/UEFI?', 'Firmware, die beim Start die Hardware initialisiert'],
        ['Wozu dient die CMOS-Batterie?', 'Erhält Uhrzeit und BIOS-Einstellungen']
      ]},
      { id: 'ifc', name: 'Schnittstellen & Steckplätze', cards: [
        ['PCIe', 'Serielle Erweiterungsschnittstelle (z. B. Grafikkarte)'],
        ['M.2', 'Steckplatz für kompakte SSDs (SATA oder NVMe)'],
        ['SATA', 'Schnittstelle für Festplatten und SSDs'],
        ['Datenrate USB 3.2 Gen 2', '10 Gbit/s'],
        ['DIMM', 'Steckplatz für RAM-Module']
      ]},
      { id: 'raid', name: 'RAID', cards: [
        ['RAID 0', 'Striping, keine Ausfallsicherheit'],
        ['RAID 1', 'Spiegelung (Mirroring)'],
        ['RAID 5', 'Striping mit Parität, mind. 3 Platten'],
        ['RAID 10', 'Spiegelung + Striping, mind. 4 Platten'],
        ['Nutzbare Kapazität: RAID 1 mit 2 × 2 TB', '2 TB']
      ]}
    ]
  },
  {
    id: 'geschichte', name: 'Geschichte', color: '#ff7a9c',
    desc: 'Urgeschichte, Griechenland, Rom',
    topics: [
      { id: 'grund', name: 'Grundlagen', cards: [
        ['Was ist eine Primärquelle?', 'Eine Quelle aus der Zeit selbst'],
        ['Was ist eine Sekundärquelle?', 'Eine spätere Darstellung über die Zeit'],
        ['Was bedeutet v. Chr.?', 'Vor Christi Geburt']
      ]},
      { id: 'urg', name: 'Urgeschichte', cards: [
        ['Lebensweise in der Altsteinzeit', 'Jäger und Sammler, nomadisch'],
        ['Neolithische Revolution', 'Übergang zu Ackerbau, Viehzucht und Sesshaftigkeit'],
        ['Wer ist Ötzi?', 'Gletschermumie aus der Kupferzeit (ca. 3300 v. Chr.)'],
        ['Reihenfolge der Metallzeiten', 'Kupfer-, Bronze-, Eisenzeit']
      ]},
      { id: 'gr', name: 'Griechenland', cards: [
        ['Was ist eine Polis?', 'Ein griechischer Stadtstaat'],
        ['Wo entstand die Demokratie?', 'In Athen'],
        ['Erste Olympische Spiele', '776 v. Chr.'],
        ['Wofür war Sparta bekannt?', 'Militärisch geprägter Stadtstaat']
      ]},
      { id: 'rom', name: 'Rom', cards: [
        ['Sagenhafte Gründung Roms', '753 v. Chr. durch Romulus und Remus'],
        ['Was ist die Res publica?', 'Die Römische Republik'],
        ['Wer waren die Konsuln?', 'Zwei jährlich gewählte höchste Beamte'],
        ['Erster römischer Kaiser', 'Augustus'],
        ['Ende des Weströmischen Reichs', '476 n. Chr.']
      ]}
    ]
  }
];
