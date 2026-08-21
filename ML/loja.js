/* Nome da loja, editável no cabeçalho.
 *
 * Clicar no nome edita ali mesmo. O avatar acompanha, mostrando as iniciais.
 * O valor fica no localStorage, então persiste ao recarregar e vale para as
 * duas páginas (Métricas e Ao vivo).
 */
(function () {
    'use strict';

    const CHAVE = 'painel-nome-loja';
    const PADRAO = 'POOL';
    const LIMITE = 24;

    /**
     * Duas letras a partir do nome.
     *
     * Nomes com mais de uma palavra pegam a inicial das duas primeiras
     * ("Pool Store" -> PS). Palavra única com maiúscula no meio segue a mesma
     * lógica ("MixDrop" -> MD). Caso contrário, as duas primeiras letras
     * ("MIXDROP" -> MI).
     */
    function iniciais(nome) {
        const limpo = String(nome || '').trim();
        if (!limpo) return '--';

        const palavras = limpo.split(/[\s._\-]+/).filter(Boolean);
        if (palavras.length >= 2) {
            return (palavras[0][0] + palavras[1][0]).toUpperCase();
        }

        const camelo = palavras[0].match(/^(.)[a-z0-9]*([A-Z])/);
        if (camelo) return (camelo[1] + camelo[2]).toUpperCase();

        return palavras[0].slice(0, 2).toUpperCase();
    }

    function aplicar(nome) {
        const avatar = document.getElementById('loja-avatar');
        const rotulo = document.getElementById('loja-nome');
        if (!avatar || !rotulo) return;

        avatar.textContent = iniciais(nome);
        avatar.title = nome;
        if (rotulo.textContent !== nome) rotulo.textContent = nome;
    }

    function lerSalvo() {
        try {
            return localStorage.getItem(CHAVE) || PADRAO;
        } catch (e) {
            return PADRAO;
        }
    }

    function salvar(nome) {
        try {
            localStorage.setItem(CHAVE, nome);
        } catch (e) {
            /* modo privado ou storage bloqueado: segue só na sessão */
        }
    }

    function iniciar() {
        const rotulo = document.getElementById('loja-nome');
        if (!rotulo) return;

        aplicar(lerSalvo());

        /* Enter confirma em vez de quebrar linha; Esc desfaz. */
        rotulo.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); rotulo.blur(); }
            if (e.key === 'Escape') { e.preventDefault(); aplicar(lerSalvo()); rotulo.blur(); }
        });

        rotulo.addEventListener('input', function () {
            aplicar(rotulo.textContent.slice(0, LIMITE));
        });

        rotulo.addEventListener('blur', function () {
            const nome = rotulo.textContent.replace(/\s+/g, ' ').trim().slice(0, LIMITE) || PADRAO;
            rotulo.textContent = nome;
            salvar(nome);
            aplicar(nome);
        });

        /* Clicar no nome não deve abrir o menu do usuário. */
        rotulo.addEventListener('click', function (e) { e.stopPropagation(); });

        /* Editou numa aba, a outra acompanha. */
        window.addEventListener('storage', function (e) {
            if (e.key === CHAVE && e.newValue) aplicar(e.newValue);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
