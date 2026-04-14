# Contributing to LicenseChain Telegram Bot

Thanks for helping improve LicenseChain Telegram Bot!

## Code of Conduct

Please read and follow our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Development Setup

```bash
# Clone
git clone https://github.com/licensechain/telegram-bot.git
cd telegram-bot

# Install deps
npm install

# Run tests
npm test
```

## Branching & Commit Style

### Branch Naming

- `feature/...` - New features
- `fix/...` - Bug fixes
- `docs/...` - Documentation changes
- `chore/...` - Maintenance tasks
- `refactor/...` - Code refactoring
- `test/...` - Test additions or changes

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only changes
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `test:` - Adding missing tests or correcting existing tests
- `chore:` - Changes to build process or auxiliary tools

Examples:
- `feat: add webhook mode support`
- `fix: resolve license validation error`
- `docs: update README with Docker instructions`
- `chore: remove unused dependencies`

## Pull Requests

1. **Link related issues** - Reference any related issues in your PR description
2. **Add tests** - Include tests for new features or bug fixes
3. **Update docs** - Update documentation if needed
4. **Follow the PR template** - Use the provided PR template
5. **Keep diffs focused** - One logical change per PR

### PR Process

1. Create a branch from `main`
2. Make your changes
3. Write/update tests
4. Update documentation
5. Run `npm run lint` and fix any issues
6. Run `npm test` to ensure all tests pass
7. Push your branch and create a PR
8. Wait for review and address feedback

## Release Process

- We use [Semantic Versioning](https://semver.org/)
- Update [CHANGELOG.md](CHANGELOG.md) with your changes
- Version bumps are handled during the release process

## Questions?

If you have questions, please open an issue or contact the maintainers.
