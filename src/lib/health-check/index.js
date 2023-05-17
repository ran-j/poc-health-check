// interface HealthCheckModule {
//     determineStatus(): Status;
//     getResponse(): HealthCheckResponse;
//     checkIntegrations(): Promise<Integration[]>;
//     registerIntegration(name: string, kind: string, optional?: boolean): void;
//     incrementIntegrationError(name: string): void;
//     resetAllIntegrationErrors(): void;
// }


module.exports = class HealthCheckModule {

    constructor() {
        this.integrationsMap = new Map();
    }

    registerIntegration(name, kind, config = {}, optional = false) {
        config = { ...this._getDefaultConfig(), ...config };
        this.integrationsMap.set(name, { kind, optional, errors: [], status: 'pass', config, name });
    }

    incrementIntegrationError(name) {
        const integration = this.integrationsMap.get(name);
        if (integration) {
            integration.errors.push({
                timestamp: Date.now()
            });
        }
    }

    setIntegrationStatus(name, status) {
        const integration = this.integrationsMap.get(name);
        if (integration) {
            integration.status = status;
        }
    }

    async getResponse() {
        return {
            status: await this._determineStatus(),
            integrations: Array.from(this.integrationsMap.values()).map(integration => {
                return {
                    ...integration,
                    config: undefined,
                    errors_length: integration.errors.length,
                    errors: undefined
                }
            })
        };
    }

    async _determineStatus() {
        await this._checkIntegrations();

        const integrationArray = Array.from(this.integrationsMap.values());

        if (integrationArray.some(integration => integration.status === 'fail' && !integration.optional)) {
            return 'down';
        }

        if (integrationArray.some(integration => integration.status === 'warn' && !integration.optional)) {
            return 'unhealthy';
        }

        return "healthy";
    }

    _checkIntegrations() {
        const promises = [];
        for (const integration of this.integrationsMap.values()) {
            promises.push(this._checkIntegration(integration));
        }
        return Promise.all(promises);
    }

    resetAllIntegrationErrors() {
        for (const integration of this.integrationsMap.values()) {
            integration.errors = [];
        }
    }

    _checkIntegration(integration) {
        return new Promise((resolve) => {
            const { errorPerIntervalToFailState, errorPerIntervalToWarnState, errorMinuteInterval } = integration.config;

            this.setIntegrationStatus(integration.name, 'pass');

            if (integration.errors.length === 0) {
                return resolve();
            }
 
            const now = Date.now();
            const fiveMinutesAgo = now - (errorMinuteInterval * 60000);
            const errorCount = integration.errors.reduce((acc, curr) => {
                if (curr.timestamp > fiveMinutesAgo) {
                    acc++;
                }
                return acc;
            }, 0)

            if (errorPerIntervalToFailState !== -1) {
                if (errorCount >= errorPerIntervalToFailState || errorPerIntervalToFailState === 0 && errorCount > 0) {
                    this.setIntegrationStatus(integration.name, 'fail');
                    return resolve();
                }
            }

            if (errorPerIntervalToWarnState !== -1) {
                if (errorCount >= errorPerIntervalToWarnState || errorPerIntervalToWarnState === 0 && errorCount > 0) {
                    this.setIntegrationStatus(integration.name, 'warn');
                    return resolve();
                }
            }

            return resolve();
        });
    }

    _getDefaultConfig() {
        return {
            errorPerIntervalToFailState: 5, //0 means any, --1 means never
            errorPerIntervalToWarnState: 0, //0 means any, -1 means never
            errorMinuteInterval: 5
        };
    }
}