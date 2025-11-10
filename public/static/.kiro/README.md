# KIRO Specification-Driven Development Protocol for ConvoBuilder

Welcome to the KIRO-powered ConvoBuilder project! This environment enforces a rigorous, specification-first approach for reliable, scalable, and maintainable SaaS development.

## What is KIRO?
KIRO is a spec-driven methodology:
- **No code before specs**: All features start as requirements, documented and agreed upon before any implementation.
- **Templates for all artifacts**: Requirements, architecture, component specs, tasks, and decision logs must use KIRO-approved templates.
- **Decision log**: Every change or choice must be recorded. Trace all design and code evolution.
- **Validation gates**: Automated checks ensure templates are filled and specs validated before progressing.

## KIRO Workflow (See `.kiro/workflow.yaml` for details)
1. **Analyze Requirements**: Use the requirements and user story templates.
2. **Design Architecture**: Propose and document architectural decisions.
3. **Specify Components**: Produce granular specs for each system/module.
4. **Decompose Tasks**: List tasks, dependencies, and sequence per component.
5. **Log All Decisions**: Anything not trivial must enter the decision log.
6. **Validate**: Run validation scripts before implementation.
7. **Generate Code (and tests)**: Only after specs pass the gate!

## Enforced Practices
- Every PR/contribution must:
  - Reference affected requirements, components, or specs.
  - Update the decision log and traceability matrix as needed.
  - Pass spec validation (`validate-specs.js`).

## Onboarding: Your First Steps
1. Study the templates in `.kiro/templates/`.
2. Review workflow in `.kiro/workflow.yaml`.
3. Read and add entries to the decision log (`.kiro/decision-log.md`) as you proceed.
4. Never implement before requirements/specs are validated.
5. Use the prompts in `.kiro/prompts/` to guide your process.

## Questions?
Post in project discussions, always referencing decision log or template section.
