// Beregneren som selvstændig side: /beregner/
const { html } = require('../lib/util');
const { layout } = require('../templates/layout');
const { icon } = require('../templates/icons');
const C = require('../templates/components');
const S = require('../templates/sections');

module.exports = function beregnerPage(site) {
  const ex = (rate) => (Math.round(S.project({ start: 0, monthly: 2000, rate, years: 30, cost: 0 }).value / 1000) * 1000).toLocaleString('da-DK');
  const body = html`
${C.pageHead({ kicker: 'Værktøj', title: 'Hvad kan din opsparing vokse til?', intro: 'Prøv med startbeløb, månedlig opsparing, afkast og omkostninger – og se, hvordan renters rente arbejder over tid.' })}
<section class="band band--paper band--flush">
  <div class="wrap">${S.calculator(site, { id: 'calc-page' })}</div>
</section>
<section class="band band--white">
  <div class="wrap">
    <div class="prose prose--lg">
      <h2>Sådan læser du beregneren</h2>
      <p><strong>Renters rente</strong> betyder, at afkastet selv giver afkast. Derfor vokser søjlerne hurtigere og hurtigere – og derfor betyder antallet af år ofte mere end det månedlige beløb.</p>
      <h3>Afkastet er en antagelse</h3>
      <p>Ingen kender fremtidens afkast. Regn derfor med flere scenarier. Sparer du 2.000&nbsp;kr. op om måneden i 30 år, giver 4&nbsp;% om året cirka ${ex(4)}&nbsp;kr., 6&nbsp;% giver cirka ${ex(6)}&nbsp;kr., og 8&nbsp;% giver cirka ${ex(8)}&nbsp;kr. – før skat og omkostninger. Forskellen viser, hvor følsomt resultatet er. I virkeligheden kommer afkastet ikke jævnt: Der vil være år med store fald.</p>
      <h3>Omkostninger tæller</h3>
      <p>Feltet "Tabt til omkostninger" viser, hvor meget mindre du ender med, end hvis der ingen omkostninger var. Prøv at skifte ÅOP fra 0,2&nbsp;% til 1,5&nbsp;%, og se forskellen over 30 år.</p>
      <h3>Skat er ikke med</h3>
      <p>Beregneren viser tal før skat. Hvor meget skatten tager, afhænger af, hvor pengene står: På en aktiesparekonto betales 17&nbsp;% af årets afkast, i frie midler betales 27&nbsp;% eller 42&nbsp;% af gevinsten, når du sælger, og i pension 15,3&nbsp;% af årets afkast.</p>
      ${(site.courses || []).length ? html`<p>Vil du forstå regnestykket bag – og hvad du selv kan styre – så start med <a href="/kurser/">kurserne</a>.</p>` : ''}
    </div>
  </div>
</section>
<section class="band band--white band--tight"><div class="wrap">${C.disclaimerPanel(site)}</div></section>`;
  return [{ path: '/beregner/', html: layout(site, { title: 'Beregner: hvad kan din opsparing vokse til?', path: '/beregner/', active: '', body, scripts: ['calc'], description: 'Beregn hvad en opsparing kan vokse til med renters rente – med startbeløb, månedlig opsparing, afkast og omkostninger. Regneeksempel, ikke rådgivning.' }) }];
};
