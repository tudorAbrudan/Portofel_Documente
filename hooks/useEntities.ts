import { useEffect, useState, useCallback } from 'react';
import type { Person, Property, Vehicle, Card } from '@/types';
import * as entities from '@/services/entities';

export function useEntities() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, pr, v, c] = await Promise.all([
        entities.getPersons(),
        entities.getProperties(),
        entities.getVehicles(),
        entities.getCards(),
      ]);
      setPersons(p);
      setProperties(pr);
      setVehicles(v);
      setCards(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    persons,
    properties,
    vehicles,
    cards,
    loading,
    error,
    refresh,
    createPerson: entities.createPerson,
    createProperty: entities.createProperty,
    createVehicle: entities.createVehicle,
    createCard: entities.createCard,
    deletePerson: entities.deletePerson,
    deleteProperty: entities.deleteProperty,
    deleteVehicle: entities.deleteVehicle,
    deleteCard: entities.deleteCard,
    updatePerson: entities.updatePerson,
    updateProperty: entities.updateProperty,
    updateVehicle: entities.updateVehicle,
    updateCard: entities.updateCard,
  };
}
