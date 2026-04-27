import { useEffect, useState, useCallback } from 'react';
import type { Person, Property, Vehicle, Card, Animal, Company } from '@/types';
import * as entities from '@/services/entities';
import { setGlobalOrder, getGlobalOrderMap, type EntityRef } from '@/services/entityOrder';

export function useEntities() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [globalOrderMap, setGlobalOrderMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, pr, v, c, a, co, orderMap] = await Promise.all([
        entities.getPersons(),
        entities.getProperties(),
        entities.getVehicles(),
        entities.getCards(),
        entities.getAnimals(),
        entities.getCompanies(),
        getGlobalOrderMap(),
      ]);
      setPersons(p);
      setProperties(pr);
      setVehicles(v);
      setCards(c);
      setAnimals(a);
      setCompanies(co);
      setGlobalOrderMap(orderMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Aplică o nouă ordine globală peste toate entitățile vizibile.
  // UI-ul trimite lista completă reorderată (pentru tab-urile per-tip, UI-ul trebuie
  // să insereze elementele reorderate în sloturile lor originale din lista globală).
  const reorder = useCallback(
    async (newOrder: EntityRef[]) => {
      try {
        await setGlobalOrder(newOrder);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Eroare la salvarea ordinii');
      }
    },
    [refresh]
  );

  return {
    persons,
    properties,
    vehicles,
    cards,
    animals,
    companies,
    globalOrderMap,
    loading,
    error,
    refresh,
    reorder,
    createPerson: entities.createPerson,
    createProperty: entities.createProperty,
    createVehicle: entities.createVehicle,
    createCard: entities.createCard,
    createAnimal: entities.createAnimal,
    createCompany: entities.createCompany,
    deletePerson: entities.deletePerson,
    deleteProperty: entities.deleteProperty,
    deleteVehicle: entities.deleteVehicle,
    deleteCard: entities.deleteCard,
    deleteAnimal: entities.deleteAnimal,
    deleteCompany: entities.deleteCompany,
    updatePerson: entities.updatePerson,
    updateProperty: entities.updateProperty,
    updateVehicle: entities.updateVehicle,
    updateCard: entities.updateCard,
    updateAnimal: entities.updateAnimal,
    updateCompany: entities.updateCompany,
  };
}
