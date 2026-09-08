# PMS access control

The live supplier access workspace is available at `/partner/access`. It is separate from the read-only `/partner/activity` audit log.

## Security boundary

- Membership and invitations are restricted to one verified `SupplyPartner`.
- Only a signed-in member with the `ADMIN` membership role can create or revoke invitations, change roles, or remove operators.
- Invitations use 256-bit random bearer tokens; only SHA-256 hashes are stored. They expire after seven days and can be accepted once or revoked before acceptance.
- A member account can belong to only one supplier. Accounts used for corporate or platform administration cannot accept supplier invitations.
- The final administrator cannot be demoted, and an administrator cannot change their own role.
- Role changes and removals revoke the affected account's active sessions and increment its access version.
- Invitation and membership mutations write partner-scoped audit records.

The interface never grants property publication, KYC approval, payout access, or payment-provider authority.
