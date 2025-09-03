// Fonction pour afficher/masquer le champ du multiplicateur
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

// Fonction principale de calcul
function calculate() {
    const etas = document.getElementById('etas').value;
    const usage = document.getElementById('usage').value;
    const surface = parseFloat(document.getElementById('surface').value);
    const zone = document.getElementById('zone').value;
    const mwhCumacPrice = parseFloat(document.getElementById('mwhCumacPrice').value);
    const bonusActive = document.getElementById('bonusCheckbox').checked;
    const bonusMultiplier = parseFloat(document.getElementById('bonusMultiplier').value);

    // Si les champs ne sont pas valides, on ne fait pas de calcul
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

// Appel initial pour afficher les résultats par défaut au chargement de la page
calculate();