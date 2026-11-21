/* Ponte entre o motor compartilhado e as páginas da réplica do ML.
   Toda a lógica dos números vive em motor-painel.js — que também é usado pela
   Vendra. Aqui só expomos os nomes globais que index.html e ao-vivo.html já
   consomem, para as duas páginas não precisarem mudar. */

const meses = MotorPainel.MESES;
const mesesLong = MotorPainel.MESES_LONGOS;
const hoje = new Date();

function stripTime(d) { return MotorPainel.semHora(d); }
function pctFixo(base, min, span) { return MotorPainel.pctFixo(base, min, span); }
function fracaoDoDia(d) { return MotorPainel.fracaoDoDia(d); }
function vendasPorHora(reg, ateSegundo) { return MotorPainel.vendasPorHora(reg, ateSegundo); }
function acumuladoPorHora(reg) { return MotorPainel.acumuladoPorHora(reg); }

const PESO_HORA = MotorPainel.PESO_HORA;
const PESO_TOTAL = MotorPainel.PESO_TOTAL;

const _serie = MotorPainel.gerarHistorico({ ate: hoje, catalogo: typeof CATALOGO_PAINEL !== "undefined" ? CATALOGO_PAINEL : null });
const catalogoPainel = typeof CATALOGO_PAINEL !== "undefined" ? CATALOGO_PAINEL : [];
const historicoVendas = _serie.dias;
const registroHoje = _serie.hoje;
const registroOntem = _serie.ontem;
const DATA_REF = _serie.dataRef;
const dataPrimeiraVenda = _serie.primeiraVenda;
const dataCriacaoConta = _serie.primeiraVenda;
let hojeSemHora = stripTime(hoje);

function aplicarProgressoHoje(agora) {
    return MotorPainel.aplicarProgresso(registroHoje, agora);
}

aplicarProgressoHoje(new Date());

/* Vendas lançadas à mão na aba Vendas do Admin da DropFly (21/11/2026).
   Moram no banco da DropFly; aqui só são buscadas e encaixadas pelo motor,
   com a mesma regra que a DropFly usa — por isso os dois painéis batem.

   Busca de novo a cada 20 s sem recarregar: as páginas já redesenham sozinhas
   (Métricas a cada 5 s, Ao vivo a cada 1 s) lendo os mesmos objetos do dia.
   Sem rede, ou com a DropFly fora, o painel segue só com o motor. */
(function () {
    const URL_MANUAIS = 'https://www.dropfly.site/api/painel/vendas-manuais';
    let versao = null;

    function buscar() {
        fetch(URL_MANUAIS, { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (dados) {
                if (!dados || !Array.isArray(dados.vendas) || dados.versao === versao) return;
                versao = dados.versao;
                MotorPainel.aplicarVendasManuais(_serie, dados.vendas, catalogoPainel);
                aplicarProgressoHoje(new Date());
            })
            .catch(function () { /* fica com o que tinha */ });
    }

    buscar();
    setInterval(buscar, 20000);
})();
