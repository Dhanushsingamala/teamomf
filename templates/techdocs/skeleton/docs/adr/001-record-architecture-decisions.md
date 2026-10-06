# ADR 001: Record architecture decisions

- **Status:** Accepted
- **Date:** on creation of this repository

## Context

Decisions made in a chat thread or a pull request comment are effectively lost
within a few months. The reasoning disappears, and the next person either
re-litigates a settled question or, worse, reverses a deliberate choice without
knowing why it was made.

## Decision

Record each significant decision as a numbered Architecture Decision Record in
`docs/adr/`, following the structure of this file: context, decision,
consequences, alternatives considered.

A decision is significant if it is expensive to reverse, constrains future
work, or would surprise a newcomer.

## Consequences

- Reviewers can see *why*, not just *what*, and the record is versioned with
  the code it describes.
- ADRs are immutable once accepted. A later decision supersedes an earlier one
  by adding a new record that references it, rather than by editing history.
- There is a small ongoing cost to writing them. That cost is the point.

## Alternatives considered

**A wiki page.** Rejected: it drifts from the code, is not reviewed, and has no
version history tied to the change that motivated it.

**Pull request descriptions only.** Rejected: not discoverable months later
without knowing which PR to look for.
