const el = (id) => document.getElementById(id);

const fuelType = el('fuelType');
const ticpeInput = el('ticpe');
const tvaInput = el('tva');
const prixAvant = el('prixAvant');
const prixApres = el('prixApres');
const ventesAvant = el('ventesAvant');
const ventesApres = el('ventesApres');

const nfEur = new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const nfEurBig = new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});
const nfInt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatEuro(n) { return nfEur.format(n); }

function formatEuroBig(n) {
    const abs = Math.abs(n);
    if (abs >= 1e6) return (n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M€';
    if (abs >= 1e4) return nfEurBig.format(n);
    return formatEuro(n);
}

function formatDiff(n, big = false) {
    const s = big ? formatEuroBig(n) : formatEuro(n);
    if (n > 0) return '+' + s;
    return s;
}

function breakdown(prixTTC, ticpe, tvaRate) {
    const r = 1 + tvaRate / 100;
    const tva = prixTTC - (prixTTC / r);
    const ht = Math.max(0, prixTTC - tva - ticpe);
    return { ht, ticpe, tva };
}

function diffClass(n) {
    if (n > 0) return 'pos';
    if (n < 0) return 'neg';
    return 'zero';
}

function compute() {
    const ticpe = parseFloat(ticpeInput.value) || 0;
    const tvaRate = parseFloat(tvaInput.value) || 0;
    const pA = parseFloat(prixAvant.value) || 0;
    const pB = parseFloat(prixApres.value) || 0;
    const vA = parseFloat(ventesAvant.value) || 0;
    const vB = parseFloat(ventesApres.value) || 0;

    const bA = breakdown(pA, ticpe, tvaRate);
    const bB = breakdown(pB, ticpe, tvaRate);

    const caA = pA * vA, caB = pB * vB;
    const ticpeA = bA.ticpe * vA, ticpeB = bB.ticpe * vB;
    const tvaA = bA.tva * vA, tvaB = bB.tva * vB;
    const taxA = ticpeA + tvaA, taxB = ticpeB + tvaB;
    const htA = bA.ht * vA, htB = bB.ht * vB;

    const rows = [
        { label: 'Prix TTC / L', a: formatEuro(pA), b: formatEuro(pB), d: pB - pA, fmt: 'euro' },
        { label: 'Part HT / L', a: formatEuro(bA.ht), b: formatEuro(bB.ht), d: bB.ht - bA.ht, fmt: 'euro' },
        { label: 'TICPE / L', a: formatEuro(bA.ticpe), b: formatEuro(bB.ticpe), d: bB.ticpe - bA.ticpe, fmt: 'euro' },
        { label: 'TVA / L', a: formatEuro(bA.tva), b: formatEuro(bB.tva), d: bB.tva - bA.tva, fmt: 'euro' },
        { label: 'Volume vendu / jour', a: nfInt.format(vA) + ' L', b: nfInt.format(vB) + ' L', d: vB - vA, fmt: 'litre' },
        { label: "Chiffre d'affaires", a: formatEuroBig(caA), b: formatEuroBig(caB), d: caB - caA, fmt: 'big' },
        { label: 'Part HT totale (distributeur)', a: formatEuroBig(htA), b: formatEuroBig(htB), d: htB - htA, fmt: 'big' },
        { label: 'Recettes TICPE', a: formatEuroBig(ticpeA), b: formatEuroBig(ticpeB), d: ticpeB - ticpeA, fmt: 'big' },
        { label: 'Recettes TVA', a: formatEuroBig(tvaA), b: formatEuroBig(tvaB), d: tvaB - tvaA, fmt: 'big', highlight: true },
        { label: 'TOTAL taxes État', a: formatEuroBig(taxA), b: formatEuroBig(taxB), d: taxB - taxA, fmt: 'big', total: true },
    ];

    const tbody = el('resultsBody');
    tbody.innerHTML = rows.map(r => {
        let d;
        if (r.fmt === 'euro') d = formatDiff(r.d);
        else if (r.fmt === 'big') d = formatDiff(r.d, true);
        else d = (r.d > 0 ? '+' : '') + nfInt.format(r.d) + ' L';
        const cls = diffClass(r.d);
        const rowCls = r.total ? 'row-total' : '';
        return `<tr class="${rowCls}">
            <td>${r.label}</td>
            <td>${r.a}</td>
            <td>${r.b}</td>
            <td class="diff ${cls}">${d}</td>
        </tr>`;
    }).join('');

    const gainDay = taxB - taxA;
    el('gainJour').textContent = formatEuroBig(gainDay);
    el('gainMois').textContent = formatEuroBig(gainDay * 30);
    el('gainAn').textContent = formatEuroBig(gainDay * 365);

    const gainTvaDay = tvaB - tvaA;
    const hint = el('tvaHint');
    if (pB > pA && gainTvaDay > 0) {
        const pct = ((pB - pA) / pA * 100).toFixed(1);
        hint.innerHTML = `Le prix a augmenté de <strong>${pct} %</strong>. Rien que sur la TVA, ` +
            `l'État récupère <strong>${formatEuroBig(gainTvaDay * 365)}</strong> supplémentaires par an ` +
            `sur ce volume de ventes.`;
    } else {
        hint.textContent = '';
    }

    el('prixAvantLabel').textContent = formatEuro(pA);
    el('prixApresLabel').textContent = formatEuro(pB);
    drawBar('barAvant', bA, pA);
    drawBar('barApres', bB, pB);
}

function drawBar(id, b, total) {
    const node = el(id);
    if (total <= 0) { node.innerHTML = ''; return; }
    const pct = (v) => (v / total * 100);
    const segs = [
        { cls: 'ht',    val: b.ht,    pct: pct(b.ht) },
        { cls: 'ticpe', val: b.ticpe, pct: pct(b.ticpe) },
        { cls: 'tva',   val: b.tva,   pct: pct(b.tva) },
    ];
    node.innerHTML = segs.map(s =>
        `<div class="seg ${s.cls}" style="width:${s.pct}%"
              title="${s.cls.toUpperCase()} : ${formatEuro(s.val)} (${s.pct.toFixed(1)} %)">
            ${s.pct > 12 ? formatEuro(s.val) : ''}
        </div>`
    ).join('');
}

fuelType.addEventListener('change', () => {
    const opt = fuelType.options[fuelType.selectedIndex];
    if (opt && opt.dataset.ticpe) ticpeInput.value = opt.dataset.ticpe;
    compute();
});

[ticpeInput, tvaInput, prixAvant, prixApres, ventesAvant, ventesApres]
    .forEach(input => input.addEventListener('input', compute));

compute();
