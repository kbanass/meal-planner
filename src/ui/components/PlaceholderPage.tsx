import { Block, Navbar, Page } from 'framework7-react';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Page>
      <Navbar title={title} />
      <Block>
        <p>Ten ekran pojawi się w kolejnej wersji.</p>
      </Block>
    </Page>
  );
}
