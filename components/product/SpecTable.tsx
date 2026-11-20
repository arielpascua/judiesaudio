import type { PublicProduct } from '@/lib/catalog/public';
import { specRows } from '@/lib/shop/spec-format';

/** The datasheet's specification table: mono readouts on hairline rows. */
export function SpecTable({ product }: { product: PublicProduct }) {
  return (
    <table className="spec-table">
      <caption className="sr-only">{`Specifications of ${product.name}`}</caption>
      <tbody>
        {specRows(product).map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
