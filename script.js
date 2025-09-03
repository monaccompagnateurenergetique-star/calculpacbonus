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
            { label: 'S < 70m²', factor: 0.5 },
            { label: '70 ≤ S < 90m²', factor: 0.7 },
            { label: '90 ≤ S < 110m²', factor: 1 },
            { label: '110 ≤ S < 130m²', factor: 1.1 },
            { label: 'S ≥ 130m²', factor: 1.6 }
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
            { label: 'S < 35m²', factor: 0.5 },
            { label: '35 ≤ S < 60m²', factor: 0.7 },
            { label: '60 ≤ S < 70m²', factor: 1 },
            { label: '70 ≤ S < 90m²', factor: 1.2 },
            { label: '90 ≤ S < 110m²', factor: 1.5 },
            { label: '110 ≤ S ≤ 130m²', factor: 1.9 },
            { label: 'S > 130m²', factor: 2.5 }
        ]
    },
    zoneFactors: {
        'H1': 1.2,
        'H2': 1,
        'H3': 0.7
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
        option.value = range.factor;
        option.textContent = range.label;
        surfaceSelect.appendChild(option);
    });
    calculate();
}

// Fonction pour afficher/masquer le champ du multiplicateur
document.getElementById('bonusCheckbox').addEventListener('change', function() {
    const bonusMultiplierInput = document.getElementById('bonusMultiplier');
    this.checked ? bonusMultiplierInput.classList.remove('hidden') : bonusMultiplierInput.classList.add('hidden');
    calculate();
});

// Écouteurs pour la navigation entre les sections
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            document.querySelectorAll('main').forEach(page => {
                page.classList.add('hidden');
            });
            document.getElementById(targetId).classList.remove('hidden');
            navLinks.forEach(navLink => navLink.classList.remove('active-link'));
            this.classList.add('active-link');
        });
    });
}

// Fonction pour générer les tableaux de la page d'explications
function generateTables() {
    // Tableaux des bases
    ['maison', 'appartement'].forEach(type => {
        const table = document.getElementById(`table-${type}-base`);
        let html = '<tr><th>Etas (%)</th><th>Usage</th><th>Montant (kWhc)</th></tr>';
        for (const etas in data[type].baseValues) {
            for (const usage in data[type].baseValues[etas]) {
                html += `<tr><td>≥ ${etas.replace('+', '%')}</td><td>${usage}</td><td>${data[type].baseValues[etas][usage].toLocaleString('fr-FR')}</td></tr>`;
            }
        }
        table.innerHTML = html;
    });

    // Tableaux des surfaces
    ['maison', 'appartement'].forEach(type => {
        const table = document.getElementById(`table-${type}-surface`);
        let html = '<tr><th>Surface (S)</th><th>Facteur</th></tr>';
        data[type].surfaceRanges.forEach(range => {
            html += `<tr><td>${range.label}</td><td>${range.factor.toFixed(1)}</td></tr>`;
        });
        table.innerHTML = html;
    });

    // Tableau des zones
    const tableZone = document.getElementById('table-zone');
    let htmlZone = '<tr><th>Zone</th><th>Facteur</th></tr>';
    for (const zone in data.zoneFactors) {
        htmlZone += `<tr><td>${zone}</td><td>${data.zoneFactors[zone].toFixed(1)}</td></tr>`;
    }
    tableZone.innerHTML = htmlZone;
}

// Écouteurs pour le calcul en temps réel
document.getElementById('typeLogement').addEventListener('change', updateSurfaceOptions);
document.getElementById('etas').addEventListener('change', calculate);
document.getElementById('usage').addEventListener('change', calculate);
document.getElementById('surfaceRange').addEventListener('change', calculate);
document.getElementById('zone').addEventListener('change', calculate);
document.getElementById('mwhCumacPrice').addEventListener('input', calculate);
document.getElementById('bonusMultiplier').addEventListener('input', calculate);

// Fonction principale de calcul
function calculate() {
    const typeLogement = document.getElementById('typeLogement').value;
    const etas = document.getElementById('etas').value;
    const usage = document.getElementById('usage').value;
    const surfaceFactor = parseFloat(document.getElementById('surfaceRange').value);
    const zone = document.getElementById('zone').value;
    const mwhCumacPrice = parseFloat(document.getElementById('mwhCumacPrice').value);
    const bonusActive = document.getElementById('bonusCheckbox').checked;
    const bonusMultiplier = parseFloat(document.getElementById('bonusMultiplier').value);

    if (isNaN(mwhCumacPrice) || mwhCumacPrice < 0) {
        document.getElementById('kwhCumacBase').textContent = "0";
        document.getElementById('kwhCumacTotal').textContent = "0";
        document.getElementById('estimatedPrime').textContent = "0 €";
        return;
    }

    const baseKwhCumac = data[typeLogement].baseValues[etas][usage];
    const zoneFactor = data.zoneFactors[zone];
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

// Appel initial pour le setup de la page
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    updateSurfaceOptions();
    generateTables();
});
