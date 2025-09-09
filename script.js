document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cee-calculator-form');
    const resultDiv = document.getElementById('results');
    const kmacResult = document.getElementById('kmac-result');
    const eurosResult = document.getElementById('euros-result');

    const ceeValues = {
        'maison': {
            '111-140': 79500,
            '140-170': 91600,
            '170-200': 99700,
            '200+': 103400,
            'ecs-111-140': 96700,
            'ecs-140-170': 111500,
            'ecs-170-200': 121400,
            'ecs-200+': 125800,
        },
        'appartement': {
            '111-140': 38400,
            '140-170': 44300,
            '170-200': 48200,
            '200+': 50000,
            'ecs-111-140': 54000,
            'ecs-140-170': 62300,
            'ecs-170-200': 67800,
            'ecs-200+': 70300,
        }
    };

    const surfaceFactors = {
        'maison': [
            { range: [0, 70], factor: 0.5 },
            { range: [70, 90], factor: 0.7 },
            { range: [90, 110], factor: 1.0 },
            { range: [110, 130], factor: 1.1 },
            { range: [130, Infinity], factor: 1.6 }
        ],
        'appartement': [
            { range: [0, 35], factor: 0.5 },
            { range: [35, 60], factor: 0.7 },
            { range: [60, 70], factor: 1.0 },
            { range: [70, 90], factor: 1.2 },
            { range: [90, 110], factor: 1.5 },
            { range: [110, 130], factor: 1.9 },
            { range: [130, Infinity], factor: 2.5 }
        ]
    };

    const zoneFactors = {
        'H1': 1.2,
        'H2': 1.0,
        'H3': 0.7
    };

    const bonusMultiplier = 5;
    const euroPerKwhCumac = 0.007;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const typeLogement = document.getElementById('type-logement').value;
        const surface = parseFloat(document.getElementById('surface').value);
        const zone = document.getElementById('zone-geographique').value;
        const etas = parseFloat(document.getElementById('etas').value);
        const usage = document.getElementById('usage').value;

        let etasKey;
        if (etas >= 111 && etas < 140) {
            etasKey = '111-140';
        } else if (etas >= 140 && etas < 170) {
            etasKey = '140-170';
        } else if (etas >= 170 && etas < 200) {
            etasKey = '170-200';
        } else if (etas >= 200) {
            etasKey = '200+';
        } else {
            resultDiv.classList.remove('hidden');
            kmacResult.textContent = 'Veuillez entrer une Etas valide.';
            eurosResult.textContent = '';
            return;
        }

        const etasCumacKey = usage === 'chauffage-ecs' ? `ecs-${etasKey}` : etasKey;

        const baseKwhCumac = ceeValues[typeLogement][etasCumacKey];
        
        let surfaceFactor = 0;
        for (const factor of surfaceFactors[typeLogement]) {
            if (surface >= factor.range[0] && surface < factor.range[1]) {
                surfaceFactor = factor.factor;
                break;
            }
        }

        const zoneFactor = zoneFactors[zone];

        const totalKwhCumac = baseKwhCumac * surfaceFactor * zoneFactor * bonusMultiplier;
        const totalEuros = totalKwhCumac * euroPerKwhCumac;

        kmacResult.textContent = `${Math.round(totalKwhCumac).toLocaleString('fr-FR')} kWh cumac`;
        eurosResult.textContent = `${Math.round(totalEuros).toLocaleString('fr-FR')} €`;
        resultDiv.classList.remove('hidden');
    });
});
