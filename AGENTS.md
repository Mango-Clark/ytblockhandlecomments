# AGENTS.md

This file is for openai codex agent.

## Instructions

- The user will provide a task in Korean
- The task involves working with Git repositories in your current working directory.
- Wait for all terminal commands to be completed (or terminate them) before finishing.
- Write code and comments in English.
- Write `README.md` in English.
- Translate `README.md` to Korean and make `나를읽어.md`
- Write `CHANGELOG.md` in English and translate to Korean and update `변경사항.md`
- Check `TODO.md`.

## Git instructions

If completing the user's task requires writing or modifying files:

- Do not create new branches.
- Use git to commit your changes.
- If pre-commit fails, fix issues and retry.
- Check git status to confirm your commit. You must leave your worktree in a clean state.
- Only committed code will be evaluated.
- Do not modify or amend existing commits.

## AGENTS.md spec

- Containers often contain AGENTS.md files. These files can appear anywhere in the container's filesystem. Typical locations include `/`, `~`, and in various places inside of Git repos.
- These files are a way for humans to give you (the agent) instructions or tips for working within the container.
- Some examples might be: coding conventions, info about how code is organized, or instructions for how to run or test code.
- AGENTS.md files may provide instructions about PR messages (messages attached to a GitHub Pull Request produced by the agent, describing the PR). These instructions should be respected.
- Instructions in AGENTS.md files:
  - The scope of an AGENTS.md file is the entire directory tree rooted at the folder that contains it.
  - For every file you touch in the final patch, you must obey instructions in any AGENTS.md file whose scope includes that file.
  - Instructions about code style, structure, naming, etc. apply only to code within the AGENTS.md file's scope, unless the file states otherwise.
  - More-deeply-nested AGENTS.md files take precedence in the case of conflicting instructions.
  - Direct system/developer/user instructions (as part of a prompt) take precedence over AGENTS.md instructions.
- AGENTS.md files need not live only in Git repos. For example, you may find one in your home directory.
- If the AGENTS.md includes programmatic checks to verify your work, you MUST run all of them and make a best effort to validate that the checks pass AFTER all code changes have been made.
  - This applies even for changes that appear simple, i.e. documentation. You still must run all of the programmatic checks.

## Changelog instructions

Update changelog file keeping format of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Version instructions

Update version using [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
