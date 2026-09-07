import {
  ChartNoAxesCombined,
  FileCheck2,
  CircleCheck,
  LockKeyhole,
  ArrowUpRight,
} from "lucide-react";

export function ProductPreview() {
  return (
    <div
      className="preview-wrap"
      aria-label="Prévia ilustrativa do painel, sem valores de clientes"
    >
      <div className="preview-orbit orbit-one" />
      <div className="preview-orbit orbit-two" />
      <div className="preview-window">
        <div className="preview-titlebar">
          <span className="window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>Seu espaço VERBA.X</span>
          <LockKeyhole size={12} />
        </div>
        <div className="preview-content">
          <div className="preview-heading">
            <div>
              <span className="tiny-label">VISÃO GERAL</span>
              <h3>Sua rescisão, explicada.</h3>
            </div>
            <span className="tag">Prévia</span>
          </div>
          <div className="preview-metrics">
            <div>
              <span>Valor devido</span>
              <strong>R$ —</strong>
              <small>Apurado pelo motor</small>
            </div>
            <div>
              <span>Valor pago</span>
              <strong>R$ —</strong>
              <small>Informado por você</small>
            </div>
            <div className="preview-difference">
              <span>Diferença</span>
              <strong>R$ —</strong>
              <small>Transparência em cada centavo</small>
            </div>
          </div>
          <div className="preview-panels">
            <div>
              <span className="tiny-label">COMPOSIÇÃO DOS DIREITOS</span>
              {[
                "Saldo de salário",
                "Aviso prévio",
                "Férias + 1/3",
                "13º proporcional",
                "Multa do FGTS",
              ].map((name, i) => (
                <div className="preview-row" key={name}>
                  <span className={`dot dot-${i}`} />
                  <span>{name}</span>
                  <span className="preview-row-line" />
                </div>
              ))}
            </div>
            <div className="preview-chart">
              <div className="empty-donut">
                <ChartNoAxesCombined size={25} strokeWidth={1.4} />
              </div>
              <p>
                Seus valores.
                <br />
                Uma visão completa.
              </p>
            </div>
          </div>
          <div className="preview-bottom">
            <CircleCheck size={14} />
            <span>Fórmulas documentadas. Sem caixa-preta.</span>
            <ArrowUpRight size={14} />
          </div>
        </div>
      </div>
      <div className="preview-float">
        <div className="float-icon">
          <FileCheck2 size={23} strokeWidth={1.4} />
        </div>
        <div>
          <strong>Cada valor tem uma explicação.</strong>
          <span>Fórmula + parâmetros + versão</span>
        </div>
      </div>
    </div>
  );
}
