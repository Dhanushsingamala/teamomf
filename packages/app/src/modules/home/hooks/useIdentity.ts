import useAsync from 'react-use/esm/useAsync';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';

export type TeamomfIdentity = {
  /** e.g. user:default/dhanush */
  userEntityRef: string;
  /** The user ref plus every group the user belongs to. */
  ownershipEntityRefs: string[];
  /** Only the group refs, for display. */
  groupRefs: string[];
  displayName?: string;
  email?: string;
};

/**
 * Reads the signed-in user's real Backstage identity.
 *
 * `ownershipEntityRefs` is produced server-side by the sign-in resolver from
 * the user's catalog Group memberships, so everything derived from it here is
 * real organisational data rather than anything the frontend invented.
 */
export function useIdentity() {
  const identityApi = useApi(identityApiRef);

  return useAsync(async (): Promise<TeamomfIdentity> => {
    const [identity, profile] = await Promise.all([
      identityApi.getBackstageIdentity(),
      identityApi.getProfileInfo(),
    ]);

    return {
      userEntityRef: identity.userEntityRef,
      ownershipEntityRefs: identity.ownershipEntityRefs,
      groupRefs: identity.ownershipEntityRefs.filter(ref =>
        ref.startsWith('group:'),
      ),
      displayName: profile.displayName,
      email: profile.email,
    };
  }, [identityApi]);
}
