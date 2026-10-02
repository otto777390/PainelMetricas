/* Botão de "olho" para mostrar/esconder senha.
 *
 * Aplica-se sozinho a todo <input type="password"> da página, então as telas
 * não precisam saber nada disso — basta carregar este arquivo.
 */
(function () {
    'use strict';

    const ABERTO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/></svg>';
    const FECHADO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 5.7A9.8 9.8 0 0 1 12 5.5c7 0 10.5 6.5 10.5 6.5a18 18 0 0 1-3.3 4.2M6.3 7.8A18 18 0 0 0 1.5 12S5 18.5 12 18.5a9.9 9.9 0 0 0 4-.8"/><path d="M10 10a3 3 0 0 0 4 4"/><path d="m2.5 2.5 19 19"/></svg>';

    function estilos() {
        if (document.getElementById('estilo-olho')) return;
        const css = document.createElement('style');
        css.id = 'estilo-olho';
        css.textContent = [
            '.caixa-olho{position:relative;display:block}',
            '.caixa-olho>input{padding-right:44px!important;width:100%}',
            '.btn-olho{position:absolute;right:6px;top:50%;transform:translateY(-50%);',
            'width:34px;height:34px;display:flex;align-items:center;justify-content:center;',
            'background:none;border:none;border-radius:6px;cursor:pointer;color:#8a94a6;padding:0}',
            '.btn-olho:hover{background:rgba(0,0,0,.06);color:#555}',
        ].join('');
        (document.head || document.documentElement).appendChild(css);
    }

    function montar(campo) {
        if (campo.dataset.olho === '1') return;
        campo.dataset.olho = '1';

        const caixa = document.createElement('div');
        caixa.className = 'caixa-olho';
        campo.parentNode.insertBefore(caixa, campo);
        caixa.appendChild(campo);

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'btn-olho';
        botao.innerHTML = ABERTO;
        botao.title = 'Mostrar senha';
        botao.setAttribute('aria-label', 'Mostrar senha');

        botao.addEventListener('click', function () {
            const vendo = campo.type === 'text';
            campo.type = vendo ? 'password' : 'text';
            botao.innerHTML = vendo ? ABERTO : FECHADO;
            botao.title = vendo ? 'Mostrar senha' : 'Esconder senha';
            botao.setAttribute('aria-label', botao.title);
            campo.focus();
        });

        caixa.appendChild(botao);
    }

    function aplicar() {
        estilos();
        document.querySelectorAll('input[type="password"]').forEach(montar);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
    else aplicar();
})();
