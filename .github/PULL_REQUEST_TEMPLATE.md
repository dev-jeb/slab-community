**What this changes** (and which directory):

**Related issue:**

---

If this PR adds a new tool, confirm the self-contained rule:

- [ ] Everything it needs lives inside its one new top-level directory
- [ ] Nothing outside that directory changed, except the README Tools table (and a path-filtered
      workflow, if it needs CI)
- [ ] No imports reach into another tool's directory
- [ ] The directory has a README: what it does, how to run it, maintainer
- [ ] No secrets committed — no `.env`, no API key in code, fixtures, or screenshots
