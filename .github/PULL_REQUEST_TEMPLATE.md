## Summary

<!-- What changed (commands, client, DB). -->

## Related issue

Closes #____

## API alignment

- [ ] Uses `POST /v1/licenses/verify` with body field `key`.
- [ ] List/aggregate commands do not expose other users’ licenses.

## Vendored API helper

- [ ] If editing `src/client/licensechainApiNormalize.js`: mirror the same bytes in `LicenseChain-Discord-Bot`, `Bots/shared/licensechain-api-normalize/index.js`, and `api/src/contracts/bot-license-contracts.ts` + tests if shapes change.

## Verification

- [ ] Smoke test: `/validate` and `/list` against staging API.
- [ ] CI / tests green.
