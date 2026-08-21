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
