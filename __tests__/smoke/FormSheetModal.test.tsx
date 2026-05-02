// app/__tests__/smoke/FormSheetModal.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FormSheetModal } from '@/components/ui/FormSheetModal';

describe('FormSheetModal', () => {
  it('randează titlul și butoanele când e vizibil', () => {
    const { getByText } = render(
      <FormSheetModal visible title="Titlu test" onClose={() => {}} onSave={() => {}}>
        <Text>Conținut</Text>
      </FormSheetModal>
    );

    expect(getByText('Titlu test')).toBeTruthy();
    expect(getByText('Anulează')).toBeTruthy();
    expect(getByText('Salvează')).toBeTruthy();
    expect(getByText('Conținut')).toBeTruthy();
  });

  it('apelează onClose la tap pe Anulează', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <FormSheetModal visible title="X" onClose={onClose} onSave={() => {}}>
        <Text>x</Text>
      </FormSheetModal>
    );

    fireEvent.press(getByText('Anulează'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('apelează onSave la tap pe Salvează', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <FormSheetModal visible title="X" onClose={() => {}} onSave={onSave}>
        <Text>x</Text>
      </FormSheetModal>
    );

    fireEvent.press(getByText('Salvează'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('arată Salvez... și blochează butonul când saving=true', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <FormSheetModal visible title="X" onClose={() => {}} onSave={onSave} saving>
        <Text>x</Text>
      </FormSheetModal>
    );

    expect(getByText('Salvez...')).toBeTruthy();
    fireEvent.press(getByText('Salvez...'));
    expect(onSave).not.toHaveBeenCalled();
  });
});
