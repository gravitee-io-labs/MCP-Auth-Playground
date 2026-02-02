function Stepper({ steps, currentStep, maxStep, onStepClick }) {
    return (
        <div className="stepper">
            {steps.map((step, index) => {
                // "Completed" means we have passed this step.
                // If maxStep is 1 (Step 1), then Step 0 is completed.
                // Logic: step.id < maxStep
                const isCompleted = step.id < maxStep;

                // "Active" is the furthest step we are currently working on.
                const isActive = step.id === maxStep;

                // "Viewing" is the step currently displayed on screen.
                const isViewing = step.id === currentStep;

                // User Request: 
                // - Entering step (Active) -> Orange + Number
                // - Complete -> Green + Tick
                // - Previous steps -> Stay green

                return (
                    <div key={step.id} className={`stepper-item-container ${isViewing ? 'viewing' : ''}`}>
                        <div
                            className={`stepper-dot ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isViewing ? 'viewing' : ''}`}
                            onClick={() => onStepClick(step.id)}
                            title={step.title}
                        >
                            {isCompleted ? '✓' : step.id}
                        </div>
                        <div className="stepper-label">{step.label}</div>
                        {index < steps.length - 1 && (
                            <div className={`stepper-line ${isCompleted ? 'completed' : ''}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default Stepper;
