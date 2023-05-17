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
            integrations: Array.from(this.integrationsMap.values())
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
            const { errorPerMinuteToFailState, errorPerMinuteToWarnState } = integration.config;

            this.setIntegrationStatus(integration.name, 'pass');

            if (integration.errors.length === 0) {
                return resolve();
            }

            const totalErrorInMs = Math.abs(Date.now() - integration.errors[0].timestamp);
            const totalErrorInMinutes = totalErrorInMs / 60000;

            const errorCount = integration.errors.length;
            const errorPerMinute = Math.floor(errorCount / totalErrorInMinutes, 0);

            if (errorPerMinuteToFailState !== -1) {
                if (errorPerMinute >= errorPerMinuteToFailState) {
                    this.setIntegrationStatus(integration.name, 'fail');
                    return resolve();
                }

                if (errorPerMinuteToFailState === 0 && errorCount > 0) {
                    this.setIntegrationStatus(integration.name, 'fail');
                    return resolve();
                }
            }

            if (errorPerMinuteToWarnState !== -1) {
                if (errorPerMinute >= errorPerMinuteToWarnState) {
                    this.setIntegrationStatus(integration.name, 'warn');
                    return resolve();
                }
                if (errorPerMinuteToWarnState === 0 && errorCount > 0) {
                    this.setIntegrationStatus(integration.name, 'warn');
                }
            }

            return resolve();
        });
    }

    _getDefaultConfig() {
        return {
            errorPerMinuteToFailState: 5, //0 means any, --1 means never
            errorPerMinuteToWarnState: 0, //0 means any, -1 means never
        };
    }
}