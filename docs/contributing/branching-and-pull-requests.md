# Branching and Pull Requests

This repository delivers each roadmap task independently so changes remain
reviewable, reversible, and traceable.

## Start a task

1. Select one unchecked task in `PLAN.md`.
2. Confirm there is no open pull request for that task.
3. Update local `main` with a fast-forward pull.
4. Create a dedicated branch.

```powershell
git switch main
git pull --ff-only origin main
git switch -c task/TASK-123-short-description
```

Use uppercase task IDs exactly as written in the roadmap. Keep the description
short, lowercase, and hyphen-separated.

Non-roadmap maintenance may use `fix/`, `docs/`, or `chore/` branches linked to
an approved issue. Do not mix unrelated work into a roadmap branch.

## Work on the branch

- Implement only the selected task and directly required support.
- Preserve unrelated work already present in the working tree.
- Update directly affected documentation and tests.
- Validate the task's measurable acceptance criteria.
- Change only the delivered task from `[ ]` to `[x]` in `PLAN.md`.
- Do not commit credentials, generated secrets, local environment files,
  participant data, or unreviewed generated media.

If the task grows beyond its stated outcome, open a follow-up issue or roadmap
task rather than silently expanding the pull request.

## Commit

Prefer one task commit:

```text
<type>: <task outcome>

<optional concise explanation>

Roadmap: <TASK-ID>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

Common types are `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `ci`, and
`chore`.

The subject states the outcome in imperative or completed-result form. The body
explains why when the diff is not self-evident. The `Roadmap` trailer is
required for roadmap work. Add the Copilot co-author trailer only when Copilot
materially contributed.

If development required several local commits, consolidate them before review
unless separate commits materially improve review. Do not rewrite a published
branch after review starts without telling reviewers.

## Open the pull request

Push the branch and open a pull request against `main`:

```powershell
git push -u origin task/TASK-123-short-description
gh pr create --base main --fill
```

The pull request must:

- Use a concise outcome-based title.
- Identify the roadmap task.
- Explain meaningful behavior, contract, or operational changes.
- List exact validation performed and disclose skipped checks.
- Describe security, privacy, localization, accessibility, deployment, and
  compatibility effects.
- Include screenshots only when they add review value and contain no sensitive
  data.

Draft pull requests are appropriate for early design feedback. A draft does not
mark the roadmap task complete.

## Review and merge

A pull request is ready to merge when:

- The implementation satisfies the task.
- Relevant validation succeeds.
- Required documentation is current.
- Security and privacy concerns are resolved.
- Review conversations are resolved or explicitly accepted.
- The branch is current enough with `main` to merge safely.

Prefer a rebase merge for a branch containing the single final task commit. Use
squash merge when development commits must be consolidated. Preserve multiple
commits only when their separation has clear review or history value.

Delete the remote task branch after merge. Never force-push `main`, bypass
required checks, or merge a task with known failing validation.

## Follow-up corrections

Do not hide post-merge defects by rewriting history. Create a new issue or
roadmap task, use a new branch, add regression coverage, and reference the
original pull request.
