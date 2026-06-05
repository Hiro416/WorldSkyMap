export interface AtmosphereProvider {
  getAtmosphere(lat: number, lon: number, date: Date): Promise<{
    aod550: number;
    humidity: number;
    source: string;
  }>;
}

export class StaticAtmosphereProvider implements AtmosphereProvider {
  async getAtmosphere(_lat: number, _lon: number, _date: Date) {
    return {
      aod550: 0.08,
      humidity: 0.5,
      source: "static-mvp",
    };
  }
}

export const atmosphereProvider: AtmosphereProvider = new StaticAtmosphereProvider();
