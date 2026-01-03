# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Helm, please report it responsibly:

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainers directly or use GitHub's private vulnerability reporting
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Considerations

### Network Exposure

Helm binds to `0.0.0.0` by default, making it accessible on all network interfaces. When running Helm:

- **Local only**: Set `HOST=127.0.0.1` in your `.env` file
- **Tailscale**: Helm is designed to work with Tailscale for secure remote access
- **Public networks**: Do NOT expose Helm directly to the internet without proper authentication

### Authentication

Helm currently relies on network-level security (Tailscale, VPN, firewall rules). There is no built-in user authentication. Ensure your network access controls are properly configured.

### API Keys

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- The `.env` file is gitignored by default
- Review `.env.example` for configuration options

### Terminal Access

The embedded terminal feature provides full shell access to the host system. This is powerful but potentially dangerous:

- Only enable terminal access in trusted environments
- Be aware that anyone with Helm access has terminal access
- Consider disabling terminal in production: set appropriate firewall rules

### OpenCode Sessions

- Sessions may contain sensitive code and conversation history
- Session data is stored locally in SQLite
- Ensure proper file permissions on `data/` directory

## Best Practices

1. **Use Tailscale** for remote access instead of exposing ports directly
2. **Keep dependencies updated**: Run `pnpm update` regularly
3. **Review permissions**: Check what MCP servers have access to
4. **Monitor access**: Review server logs for unexpected activity
5. **Backup data**: Regularly backup the `data/` directory

## Hardening Checklist

- [ ] Set `HOST=127.0.0.1` if local-only access is needed
- [ ] Configure firewall rules appropriately
- [ ] Use Tailscale or VPN for remote access
- [ ] Review and restrict MCP server permissions
- [ ] Keep all dependencies updated
- [ ] Set appropriate file permissions on data directories
