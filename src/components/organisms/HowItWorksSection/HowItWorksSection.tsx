import './index.css';

export interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface HowItWorksSectionProps {
  steps: Step[];
}

export default function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  return (
    <section className="how-it-works-section">
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">How Asharvi Works</h2>
          <p className="section-subtitle">
            Transform child behavior in four simple steps
          </p>
        </div>

        <div className="steps-timeline">
          {steps.map((step, index) => (
            <div key={step.number} className="step-item">
              <div className="step-number">{step.number}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
              
              {index < steps.length - 1 && (
                <div className="step-connector" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
