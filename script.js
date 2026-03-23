// Données officielles BAR-TH-174 / BAR-TH-175 (version A80.3, applicable depuis le 17/01/2026)
// Source : Ministère de la Transition Écologique

const CEE_DATA = {
    // Montants de base en kWh cumac selon le nombre de sauts de classes DPE
    kwhCumacBase: {
        2: 360200,
        3: 447900,
        4: 568600  // 4 sauts ou plus
    },

    // Facteur correctif selon la surface habitable (Shab) — identique maison et appartement
    surfaceFactors: [
        { label: 'Moins de 35 m²', value: 0.4 },
        { label: 'De 35 à 59 m²', value: 0.5 },
        { label: 'De 60 à 89 m²', value: 0.8 },
        { label: 'De 90 à 110 m²', value: 1.0 },
        { label: 'De 110 à 130 m²', value: 1.2 },
        { label: 'Plus de 130 m²', value: 1.3 }
    ],

    // Ordre des classes DPE (de la meilleure à la pire)
    classesDPE: ['A', 'B', 'C', 'D', 'E', 'F', 'G']
};

// Éléments DOM
const elements = {
    typeLogement: document.getElementById('typeLogement'),
    surfaceRange: document.getElementById('surfaceRange'),
    classeAvant: document.getElementById('classeAvant'),
    classeApres: document.getElementById('classeApres'),
    prixMWhCumac: document.getElementById('prixMWhCumac'),
    coupDePouce: document.getElementById('coupDePouce'),
    // Résultats
    kwhCumacBase: document.getElementById('kwhCumacBase'),
    coeffSurface: document.getElementById('coeffSurface'),
    coeffCdP: document.getElementById('coeffCdP'),
    kwhCumacTotal: document.getElementById('kwhCumacTotal'),
    primeCEE: document.getElementById('primeCEE'),
    resultNote: document.getElementById('resultNote'),
    // DPE visuel
    dpeBefore: document.getElementById('dpeBefore'),
    dpeAfter: document.getElementById('dpeAfter'),
    dpeSauts: document.getElementById('dpeSauts'),
    dpeArrow: document.getElementById('dpeArrow')
};

// Calcul du nombre de sauts de classes DPE
function calculateSauts(classeAvant, classeApres) {
    const indexAvant = CEE_DATA.classesDPE.indexOf(classeAvant);
    const indexApres = CEE_DATA.classesDPE.indexOf(classeApres);
    return indexAvant - indexApres;
}

// Mise à jour de la visualisation DPE
function updateDPEVisual(classeAvant, classeApres, sauts) {
    elements.dpeBefore.textContent = classeAvant;
    elements.dpeBefore.className = 'dpe-before dpe-' + classeAvant;

    elements.dpeAfter.textContent = classeApres;
    elements.dpeAfter.className = 'dpe-after dpe-' + classeApres;

    if (sauts < 2) {
        elements.dpeArrow.className = 'dpe-arrow error';
        elements.dpeSauts.textContent = sauts <= 0
            ? 'Classe après doit être meilleure'
            : '1 saut — minimum 2 requis';
    } else {
        elements.dpeArrow.className = 'dpe-arrow';
        elements.dpeSauts.textContent = sauts + ' saut' + (sauts > 1 ? 's' : '') + ' de classe';
    }
}

// Mise à jour des options de classe après travaux selon la classe avant
function updateClasseApresOptions() {
    const classeAvant = elements.classeAvant.value;
    const indexAvant = CEE_DATA.classesDPE.indexOf(classeAvant);
    const currentApres = elements.classeApres.value;

    elements.classeApres.innerHTML = '';

    // Proposer uniquement les classes meilleures (index inférieur)
    for (let i = 0; i < indexAvant; i++) {
        const classe = CEE_DATA.classesDPE[i];
        const option = document.createElement('option');
        option.value = classe;
        option.textContent = classe;
        elements.classeApres.appendChild(option);
    }

    // Restaurer la sélection si elle est toujours valide
    const options = Array.from(elements.classeApres.options).map(o => o.value);
    if (options.includes(currentApres)) {
        elements.classeApres.value = currentApres;
    }

    calculate();
}

// Fonction principale de calcul
function calculate() {
    const classeAvant = elements.classeAvant.value;
    const classeApres = elements.classeApres.value;
    const surfaceFactor = parseFloat(elements.surfaceRange.value);
    const prixMWh = parseFloat(elements.prixMWhCumac.value);
    const coupDePouce = parseInt(elements.coupDePouce.value);

    const sauts = calculateSauts(classeAvant, classeApres);

    // Mettre à jour le visuel DPE
    updateDPEVisual(classeAvant, classeApres, sauts);

    // Vérifier la validité
    if (sauts < 2 || isNaN(prixMWh) || prixMWh < 0) {
        elements.kwhCumacBase.textContent = '—';
        elements.coeffSurface.textContent = '×' + surfaceFactor.toLocaleString('fr-FR');
        elements.coeffCdP.textContent = '×' + coupDePouce;
        elements.kwhCumacTotal.textContent = '—';
        elements.primeCEE.textContent = '—';

        if (sauts < 2) {
            elements.resultNote.textContent = 'Un gain d\'au moins 2 classes DPE est requis pour être éligible.';
            elements.resultNote.className = 'result-note visible';
        } else {
            elements.resultNote.className = 'result-note';
        }
        return;
    }

    // Calcul des kWh cumac
    // Pour 4 sauts ou plus, on utilise la valeur "4+"
    const sautsKey = Math.min(sauts, 4);
    const baseKwh = CEE_DATA.kwhCumacBase[sautsKey];
    const totalKwh = baseKwh * surfaceFactor * coupDePouce;

    // Calcul de la prime en euros
    const primeEuros = (totalKwh / 1000) * prixMWh;

    // Affichage des résultats
    elements.kwhCumacBase.textContent = baseKwh.toLocaleString('fr-FR') + ' kWh cumac';
    elements.coeffSurface.textContent = '×' + surfaceFactor.toLocaleString('fr-FR');
    elements.coeffCdP.textContent = '×' + coupDePouce;
    elements.kwhCumacTotal.textContent = totalKwh.toLocaleString('fr-FR') + ' kWh cumac';
    elements.primeCEE.textContent = primeEuros.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }) + ' €';

    // Note explicative
    const ficheRef = elements.typeLogement.value === 'maison' ? 'BAR-TH-174' : 'BAR-TH-175';
    elements.resultNote.textContent =
        'Calcul : ' + baseKwh.toLocaleString('fr-FR') + ' × ' + surfaceFactor.toLocaleString('fr-FR') +
        ' × ' + coupDePouce + ' = ' + totalKwh.toLocaleString('fr-FR') + ' kWh cumac' +
        ' | Prime : ' + totalKwh.toLocaleString('fr-FR') + ' ÷ 1000 × ' + prixMWh.toLocaleString('fr-FR') +
        ' €/MWh = ' + primeEuros.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
        ' € (fiche ' + ficheRef + ')';
    elements.resultNote.className = 'result-note visible';
}

// Écouteurs d'événements
elements.typeLogement.addEventListener('change', calculate);
elements.surfaceRange.addEventListener('change', calculate);
elements.classeAvant.addEventListener('change', updateClasseApresOptions);
elements.classeApres.addEventListener('change', calculate);
elements.prixMWhCumac.addEventListener('input', calculate);
elements.coupDePouce.addEventListener('change', calculate);

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    updateClasseApresOptions();
});
