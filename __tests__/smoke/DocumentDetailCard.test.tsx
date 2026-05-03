import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { DocumentDetailCard } from '@/components/DocumentDetailCard';
import { DocumentDetailRow } from '@/components/DocumentDetailRow';

describe('DocumentDetailCard', () => {
  it('randează titlul și conținutul', () => {
    const { getByText } = render(
      <DocumentDetailCard title="Detalii">
        <Text>conținut</Text>
      </DocumentDetailCard>
    );
    expect(getByText('Detalii')).toBeTruthy();
    expect(getByText('conținut')).toBeTruthy();
  });

  it('randează un header custom în locul titlului', () => {
    const { getByText, queryByText } = render(
      <DocumentDetailCard
        title="Ignorat"
        header={
          <View>
            <Text>Header custom</Text>
          </View>
        }
      >
        <Text>x</Text>
      </DocumentDetailCard>
    );
    expect(getByText('Header custom')).toBeTruthy();
    expect(queryByText('Ignorat')).toBeNull();
  });

  it('marchează ultimul DocumentDetailRow cu last=true', () => {
    const { UNSAFE_getAllByType } = render(
      <DocumentDetailCard title="X">
        <DocumentDetailRow label="A" value="1" />
        <DocumentDetailRow label="B" value="2" />
        <DocumentDetailRow label="C" value="3" />
      </DocumentDetailCard>
    );
    const rows = UNSAFE_getAllByType(DocumentDetailRow);
    expect(rows[0].props.last).toBeFalsy();
    expect(rows[1].props.last).toBeFalsy();
    expect(rows[2].props.last).toBe(true);
  });

  it('marchează ultimul DocumentDetailRow chiar dacă există copii non-row după el', () => {
    const { UNSAFE_getAllByType } = render(
      <DocumentDetailCard title="X">
        <DocumentDetailRow label="A" value="1" />
        <DocumentDetailRow label="B" value="2" />
        <View>
          <Text>buton standalone</Text>
        </View>
      </DocumentDetailCard>
    );
    const rows = UNSAFE_getAllByType(DocumentDetailRow);
    expect(rows[0].props.last).toBeFalsy();
    expect(rows[1].props.last).toBe(true);
  });
});
