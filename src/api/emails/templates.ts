import {
	CreateTemplateCommandInput,
	CreateTemplateCommand,
	UpdateTemplateCommand,
	DeleteTemplateCommand,
	ListTemplatesCommand,
	ListTemplatesCommandOutput,
	DeleteTemplateCommandInput,
} from '@aws-sdk/client-ses';
import { Email } from '../database/schema';
import { sesClient } from './aws';

export async function createGenericTemplate() {
	const params: CreateTemplateCommandInput = {
		Template: {
			TemplateName: 'GenericTemplate',
			SubjectPart: '{{subject}}',
			HtmlPart: '{{htmlBody}}',
			TextPart: '{{textBody}}',
		},
	};

	await sesClient.send(new CreateTemplateCommand(params));
	console.log('Generic template created');
}

export function emailToSESTemplate(
	email: Email
): CreateTemplateCommandInput | undefined {
	if (email.status === 'component') {
		console.error('Components are not eligible for SES templates:', email);
		return;
	}
	if (!email.subject) {
		console.error('Subject not provided for template: ', email);
		return;
	}

	return {
		Template: {
			TemplateName: email.name ?? email.id.toString(),
			SubjectPart: email.subject!,
			HtmlPart: email.content,
		},
	};
}

export async function createEmailTemplate(email: Email) {
	const template = emailToSESTemplate(email);

	if (!template) return;

	try {
		const command = new CreateTemplateCommand(template);
		const response = await sesClient.send(command);
		console.log('Email template created successfully:', response);
	} catch (error) {
		console.error('Error creating email template:', error);
	}
}

export async function updateEmailTemplate(email: Email) {
	const template = emailToSESTemplate(email);

	if (!template) return;

	try {
		const command = new UpdateTemplateCommand(template);
		const response = await sesClient.send(command);
		console.log('Email template updated successfully:', response);
	} catch (error) {
		console.error('Error updating email template:', error);
	}
}

export async function deleteEmailTemplate(email: Email | string) {
	try {
		const command = new DeleteTemplateCommand({
			TemplateName:
				typeof email === 'string' ? email : email.name ?? email.id.toString(),
		});
		const response = await sesClient.send(command);
		console.log('Email template updated successfully:', response);
	} catch (error) {
		console.error('Error updating email template:', error);
	}
}

export async function deleteAllTemplates() {
	try {
		const listCommand = new ListTemplatesCommand({});
		let templatesResponse: ListTemplatesCommandOutput;
		let templates: string[] = [];

		do {
			templatesResponse = await sesClient.send(listCommand);
			templates = templates.concat(
				templatesResponse.TemplatesMetadata?.map((t) => t.Name || '') || []
			);
			listCommand.input.NextToken = templatesResponse.NextToken;
		} while (templatesResponse.NextToken);

		console.log(`Found ${templates.length} templates.`);

		for (const templateName of templates) {
			const deleteParams: DeleteTemplateCommandInput = {
				TemplateName: templateName,
			};
			const deleteCommand = new DeleteTemplateCommand(deleteParams);
			await sesClient.send(deleteCommand);
			console.log(`Deleted template: ${templateName}`);
		}

		console.log('All templates have been deleted.');
	} catch (error) {
		console.error('Error deleting templates:', error);
	}
}
