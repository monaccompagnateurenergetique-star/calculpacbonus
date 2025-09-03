// Fonction pour basculer entre le calculateur et la page d'explications
function showPage(pageId) {
    const calculatorPage = document.getElementById('calculateur');
    const explanationsPage = document.getElementById('explications');
    const links = document.querySelectorAll('nav a');

    if (pageId === 'calculateur') {
        calculatorPage.classList.remove('hidden');
        explanationsPage.classList.add('hidden');
        links[0].classList.add('active-link');
        links[1].classList.remove('active-link');
    } else {
        calculatorPage.classList.add('hidden');
        explanationsPage.classList.remove('hidden');
        links[0].classList.remove('active-link');
        links[1].classList.add('active-link');
    }
}

// Ajout des listeners pour la navigation
document.querySelector('a[href="#calculateur"]').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('calculateur');
});

document.querySelector('a[href="#explications"]').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('explications');
});

// Écouteur pour afficher/masquer le champ du multiplicateur et recalculer
document.getElementById('bonusCheckbox').addEventListener('change', function() {
    const bonusMultiplierInput = document.getElementById('bonusMultiplier');
    if (this.checked) {
        bonusMultiplierInput.classList.remove('hidden');
    } else {
        bonusMultiplierInput.classList.add('hidden');
    }
    calculate();
});

// Ajout des "event listeners" pour un calcul en temps réel
document.getElementById('etas').addEventListener('change', calculate);
document.getElementById('usage').addEventListener('change', calculate);
document.getElementById('surface').addEventListener('input', calculate);
document.getElementById('zone').addEventListener('change', calculate);
document.getElementById('mwhCumacPrice').addEventListener('input', calculate);
document.getElementById('bonusMultiplier').addEventListener('input', calculate);
document.getElementById('calculate-btn').addEventListener('click', calculate);

// Fonction principale de calcul
function calculate() {
    const etas = document.getElementById('etas').value;
    const usage = document.getElementById('usage').value;
    const surface = parseFloat(document.getElementById('surface').value);
    const zone = document.getElementById('zone').value;
    const mwhCumacPrice = parseFloat(document.getElementById('mwhCumacPrice').value);
    const bonusActive = document.getElementById('bonusCheckbox').checked;
    const bonusMultiplier = parseFloat(document.getElementById('bonusMultiplier').value);

    if (isNaN(surface) || surface <= 0 || isNaN(mwhCumacPrice) || mwhCumacPrice < 0) {
        document.getElementById('kwhCumacBase').textContent = "0";
        document.getElementById('kwhCumacTotal').textContent = "0";
        document.getElementById('estimatedPrime').textContent = "0 €";
        return;
    }

    const baseValues = {
        '111-140': { 'Chauffage et ECS': 47800, 'Chauffage': 37600 },
        '140-170': { 'Chauffage et ECS': 77300, 'Chauffage': 60800 },
        '170-200': { 'Chauffage et ECS': 97100, 'Chauffage': 76300 },
        '200+': { 'Chauffage et ECS': 106000, 'Chauffage': 83300 }
    };

    const surfaceFactors = [
        { min: 0, max: 69, factor: 0.5 },
        { min: 70, max: 89, factor: 0.7 },
        { min: 90, max: 109, factor: 1 },
        { min: 110, max: 129, factor: 1.1 },
        { min: 130, max: Infinity, factor: 1.6 }
    ];

    const zoneFactors = {
        'H1': 1.2,
        'H2': 1,
        'H3': 0.7
    };

    const baseKwhCumac = baseValues[etas][usage];
    
    let surfaceFactor = 0;
    for (const range of surfaceFactors) {
        if (surface >= range.min && surface <= range.max) {
            surfaceFactor = range.factor;
            break;
        }
    }

    const zoneFactor = zoneFactors[zone];
    const finalKwhCumacBase = baseKwhCumac * surfaceFactor * zoneFactor;

    let finalKwhCumacTotal = finalKwhCumacBase;
    if (bonusActive) {
        if (isNaN(bonusMultiplier) || bonusMultiplier <= 0) {
            finalKwhCumacTotal = 0;
        } else {
            finalKwhCumacTotal = finalKwhCumacBase * bonusMultiplier;
        }
    }

    const estimatedPrime = (finalKwhCumacTotal / 1000) * mwhCumacPrice;

    document.getElementById('kwhCumacBase').textContent = finalKwhCumacBase.toFixed(0);
    document.getElementById('kwhCumacTotal').textContent = finalKwhCumacTotal.toFixed(0);
    document.getElementById('estimatedPrime').textContent = estimatedPrime.toFixed(2) + ' €';
}

// Appel initial pour que le calculateur soit prêt au chargement
document.addEventListener('DOMContentLoaded', calculate);
