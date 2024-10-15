import { SESClient } from '@aws-sdk/client-ses';

export const sesClient = new SESClient({
	region: import.meta.env.AWS_REGION!,
	credentials: {
		accessKeyId: import.meta.env.AWS_AK!,
		secretAccessKey: import.meta.env.AWS_AK_SECRET!,
	},
});
