// Données pour le calcul
const data = {
    maison: {
        baseValues: {
            '111-140': { 'Chauffage et ECS': 47800, 'Chauffage': 37600 },
            '140-170': { 'Chauffage et ECS': 77300, 'Chauffage': 60800 },
            '170-200': { 'Chauffage et ECS': 97100, 'Chauffage': 76300 },
            '200+': { 'Chauffage et ECS': 106000, 'Chauffage': 83300 }
        },
        surfaceRanges: [
            { label: 'S < 70m²', value: 0.5 },
            { label: '70 ≤ S < 90m²', value: 0.7 },
            { label: '90 ≤ S < 110m²', value: 1 },
            { label: '110 ≤ S < 130m²', value: 1.1 },
            { label: 'S ≥ 130m²', value: 1.6 }
        ]
    },
    appartement: {
        baseValues: {
            '111-140': { 'Chauffage et ECS': 26000, 'Chauffage': 16600 },
            '140-170': { 'Chauffage et ECS': 42000, 'Chauffage': 26900 },
            '170-200': { 'Chauffage et ECS': 52700, 'Chauffage': 33700 },
            '200+': { 'Chauffage et ECS': 57600, 'Chauffage': 36800 }
        },
        surfaceRanges: [
            { label: 'S < 35m²', value: 0.5 },
            { label: '35 ≤ S < 60m²', value: 0.7 },
            { label: '60 ≤ S < 70m²', value: 1 },
            { label: '70 ≤ S < 90m²', value: 1.2 },
            { label: '90 ≤ S < 110m²', value: 1.5 },
            { label: '110 ≤ S ≤ 130m²', value: 1.9 },
            { label: 'S > 130m²', value: 2.5 }
        ]
    },
    zoneFactors: {
        'H1': 1.2,
        'H2': 1,
        'H3': 0.7
    },
    mpRenovAids: {
        'bleu': 5000,
        'jaune': 4000,
        'violet': 3000,
        'rose': 0
    }
};

// Fonction pour générer les options de surface selon le type de logement
function updateSurfaceOptions() {
    const type = document.getElementById('typeLogement').value;
    const surfaceSelect = document.getElementById('surfaceRange');
    
    // Vider les options existantes
    surfaceSelect.innerHTML = '';
    
    // Remplir avec les nouvelles options
    data[type].surfaceRanges.forEach(range => {
        const option = document.createElement('option');
        option.value = range.value;
        option.textContent = range.label;
        surfaceSelect.appendChild(option);
    });
    calculate();
}

// Fonction pour afficher/masquer le champ du multiplicateur
document.getElementById('bonusCheckbox').addEventListener('change', calculate);

// Écouteurs pour le calcul en temps réel
document.getElementById('typeLogement').addEventListener('change', updateSurfaceOptions);
document.getElementById('etas').addEventListener('change', calculate);
document.getElementById('usage').addEventListener('change', calculate);
document.getElementById('surfaceRange').addEventListener('change', calculate);
document.getElementById('zone').addEventListener('change', calculate);
document.getElementById('mwhCumacPrice').addEventListener('input', calculate);
document.getElementById('revenuCategory').addEventListener('change', calculate);

// Fonction principale de calcul
function calculate() {
    const typeLogement = document.getElementById('typeLogement').value;
    const etas = document.getElementById('etas').value;
    const usage = document.getElementById('usage').value;
    const surfaceFactor = parseFloat(document.getElementById('surfaceRange').value);
    const zone = document.getElementById('zone').value;
    const mwhCumacPrice = parseFloat(document.getElementById('mwhCumacPrice').value);
    const bonusActive = document.getElementById('bonusCheckbox').checked;
    
    if (isNaN(mwhCumacPrice) || mwhCumacPrice < 0) {
        document.getElementById('kwhCumacTotal').textContent = "0 kWh";
        document.getElementById('estimatedPrimeCEE').textContent = "0 €";
        document.getElementById('mpRenovAide').textContent = "0 €";
        document.getElementById('totalAides').textContent = "0 €";
        return;
    }

    const baseKwhCumac = data[typeLogement].baseValues[etas][usage];
    const zoneFactor = data.zoneFactors[zone];
    const finalKwhCumacBase = baseKwhCumac * surfaceFactor * zoneFactor;

    let finalKwhCumacTotal = finalKwhCumacBase;
    if (bonusActive) {
        finalKwhCumacTotal = finalKwhCumacBase * 5;
    }

    const estimatedPrimeCEE = (finalKwhCumacTotal / 1000) * mwhCumacPrice;
    const mpRenovAide = data.mpRenovAids[revenuCategory];
    const totalAides = estimatedPrimeCEE + mpRenovAide;

    document.getElementById('kwhCumacTotal').textContent = finalKwhCumacTotal.toLocaleString('fr-FR') + ' kWh';
    document.getElementById('estimatedPrimeCEE').textContent = estimatedPrimeCEE.toFixed(2).replace('.', ',') + ' €';
    document.getElementById('mpRenovAide').textContent = mpRenovAide.toFixed(2).replace('.', ',') + ' €';
    document.getElementById('totalAides').textContent = totalAides.toFixed(2).replace('.', ',') + ' €';
}

// Appel initial pour que le calculateur soit prêt au chargement
document.addEventListener('DOMContentLoaded', () => {
    updateSurfaceOptions();
});
