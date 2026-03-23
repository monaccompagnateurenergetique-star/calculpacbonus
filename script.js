// Données pour le calcul
const data = {
    maison: {
        baseValues: {
            '111-140': { 'Chauffage et ECS': 96700, 'Chauffage': 79500 },
            '140-170': { 'Chauffage et ECS': 111500, 'Chauffage': 91600 },
            '170-200': { 'Chauffage et ECS': 121400, 'Chauffage': 99700 },
            '200+': { 'Chauffage et ECS': 125800, 'Chauffage': 103400 }
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
            '111-140': { 'Chauffage et ECS': 54000, 'Chauffage': 38400 },
            '140-170': { 'Chauffage et ECS': 62300, 'Chauffage': 44300 },
            '170-200': { 'Chauffage et ECS': 67800, 'Chauffage': 48200 },
            '200+': { 'Chauffage et ECS': 70300, 'Chauffage': 50000 }
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

// Écouteurs pour le calcul en temps réel
document.getElementById('typeLogement').addEventListener('change', updateSurfaceOptions);
document.getElementById('etas').addEventListener('change', calculate);
document.getElementById('usage').addEventListener('change', calculate);
document.getElementById('surfaceRange').addEventListener('change', calculate);
document.getElementById('zone').addEventListener('change', calculate);
document.getElementById('mwhCumacPrice').addEventListener('input', calculate);
document.getElementById('revenuCategory').addEventListener('change', calculate);
document.getElementById('bonusCheckbox').addEventListener('change', calculate);

// Fonction principale de calcul
function calculate() {
    const typeLogement = document.getElementById('typeLogement').value;
    const etas = document.getElementById('etas').value;
    const usage = document.getElementById('usage').value;
    const surfaceFactor = parseFloat(document.getElementById('surfaceRange').value);
    const zone = document.getElementById('zone').value;
    const mwhCumacPrice = parseFloat(document.getElementById('mwhCumacPrice').value);
    const bonusActive = document.getElementById('bonusCheckbox').checked;
    const revenuCategory = document.getElementById('revenuCategory').value;
    
    if (isNaN(mwhCumacPrice) || mwhCumacPrice < 0) {
        document.getElementById('kwhCumacTotal').textContent = "0 kWh";
        document.getElementById('estimatedPrimeCEE').textContent = "0 €";
        document.getElementById('mpRenovAide').textContent = "0 €";
        document.getElementById('totalAides').textContent = "0 €";
        return;
    }

    const baseKwhCumac = data[typeLogement].baseValues[etas][usage];
    const zoneFactor = data.zoneFactors[zone];
    
    let finalKwhCumac = baseKwhCumac * surfaceFactor * zoneFactor;
    if (bonusActive) {
        finalKwhCumac = finalKwhCumac * 5;
    }

    const estimatedPrimeCEE = (finalKwhCumac / 1000) * mwhCumacPrice;
    const mpRenovAide = data.mpRenovAids[revenuCategory];
    const totalAides = estimatedPrimeCEE + mpRenovAide;

    document.getElementById('kwhCumacTotal').textContent = finalKwhCumac.toLocaleString('fr-FR') + ' kWh';
    document.getElementById('estimatedPrimeCEE').textContent = estimatedPrimeCEE.toFixed(2).replace('.', ',') + ' €';
    document.getElementById('mpRenovAide').textContent = mpRenovAide.toFixed(2).replace('.', ',') + ' €';
    document.getElementById('totalAides').textContent = totalAides.toFixed(2).replace('.', ',') + ' €';
}

// Appel initial pour que le calculateur soit prêt au chargement
document.addEventListener('DOMContentLoaded', () => {
    updateSurfaceOptions();
});
