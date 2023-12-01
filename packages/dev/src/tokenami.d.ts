import type * as CSS from 'csstype';
import type * as ConfigUtils from '@tokenami/config';

type Merge<A, B> = Omit<A, keyof B> & B;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

declare global {
  // consumer will override this interface
  interface TokenamiConfig {}
  interface TokenamiFinalConfig extends Merge<ConfigUtils.DefaultConfig, TokenamiConfig> {}
}

type Style<P extends string, V> = { [key in ConfigUtils.TokenProperty<P>]?: V };
type VariantStyle<P extends string, M extends string, V> = Style<P, V> &
  Style<`${M}_${P}`, V> &
  Style<`${string}_${P}`, V>;

type PropertyConfig = NonNullable<TokenamiFinalConfig['properties']>;
type Media = keyof NonNullable<TokenamiFinalConfig['media']>;

type Prefix<P> = P extends keyof PropertyConfig
  ? Exclude<NonNullable<PropertyConfig[P]>[number], 'grid'>
  : never;

type Values<Prefix> = Prefix extends keyof TokenamiFinalConfig['theme']
  ? keyof TokenamiFinalConfig['theme'][Prefix]
  : never;

type TokenValue<P> = Prefix<P> extends infer Pfx
  ? Pfx extends string
    ? Values<Pfx> extends infer Value
      ? Value extends string
        ? ConfigUtils.TokenValue<Pfx, Value>
        : never
      : never
    : never
  : never;

type CSSPropertyValue<P> = P extends keyof CSS.PropertiesHyphen ? CSS.PropertiesHyphen[P] : never;
type ThemedValue<P extends string> = TokenValue<P> | ConfigUtils.ArbitraryValue;
type ThemedGridValue<P extends string> =
  | TokenValue<P>
  | ConfigUtils.ArbitraryValue
  | ConfigUtils.GridValue;

type TokenamiStyles = {} /* TOKENAMI_STYLES */;

type TokenamiAliasStyles = {
  [K in keyof TokenamiFinalConfig['aliases']]: TokenamiFinalConfig['aliases'][K][number] extends infer L
    ? L extends ConfigUtils.CSSProperty
      ? VariantStyle<K, Media, TokenamiStyles[ConfigUtils.TokenProperty<L>]>
      : never
    : never;
}[keyof TokenamiFinalConfig['aliases']];

declare module 'csstype' {
  interface Properties extends TokenamiStyles, UnionToIntersection<TokenamiAliasStyles> {
    [key: `--_${string}`]: any;
  }
}