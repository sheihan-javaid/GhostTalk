import { config } from 'dotenv';
config();

import '@/ai/flows/anonymize-message-metadata.ts';
import '@/ai/flows/generate-anonymous-name.ts';
import '@/ai/flows/ghost-chat.ts';
import '@/ai/flows/moderate-confession.ts';
