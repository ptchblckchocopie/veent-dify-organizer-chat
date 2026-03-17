import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const secret = url.searchParams.get('secret');
	if (secret !== env.ANALYTICS_SECRET) {
		throw error(401, 'Unauthorized');
	}

	const res = await fetch(`/api/analytics?secret=${encodeURIComponent(secret)}`);
	if (!res.ok) {
		throw error(res.status, 'Failed to load analytics');
	}

	return { analytics: await res.json(), secret };
};
