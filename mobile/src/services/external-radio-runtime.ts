import { ExternalRadioTransport, type ExternalRadioClient } from './external-radio-transport';
import { meshService } from './mesh-service';

/**
 * Native partner integrations call this only after the user has paired real radio hardware.
 * It deliberately does not attempt discovery, pairing, or range claims on its own.
 */
export function registerExternalRadioClient(client: ExternalRadioClient): void {
  meshService.setTransport(new ExternalRadioTransport(client));
}
