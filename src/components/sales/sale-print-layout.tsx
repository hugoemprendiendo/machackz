
import React from 'react';
import type { Sale, Client } from '@/lib/types';
import { format } from 'date-fns';

interface SalePrintLayoutProps {
  sale: Sale;
  client: Client;
}

export const SalePrintLayout = React.forwardRef<HTMLDivElement, SalePrintLayoutProps>(
  ({ sale, client }, ref) => {
    return (
      <div ref={ref} className="p-8 font-sans text-sm text-gray-900">
        <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">MacHackz</h1>
            <p className="text-gray-500">Taller de Reparación y Venta</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">Nota de Venta #{sale.id}</h2>
            <p className="text-gray-600">Fecha: {format(new Date(sale.createdAt), 'dd/MM/yyyy')}</p>
          </div>
        </header>

        <section className="my-8">
          <h3 className="font-semibold text-gray-700 border-b pb-1 mb-2">Cliente</h3>
          <p className="font-bold">{client.name}</p>
          <p>{client.address}</p>
          <p>{client.phone}</p>
          <p>{client.email}</p>
        </section>

        <section className="my-8">
          <h3 className="font-semibold text-gray-700 border-b pb-1 mb-2">Items Vendidos</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Producto/Servicio</th>
                <th className="p-2 text-center">Cantidad</th>
                <th className="p-2 text-right">Precio Unit.</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={`${item.lotId}-${index}`} className="border-b">
                  <td className="p-2">{item.name} {item.taxRate > 0 && `(IVA ${item.taxRate}%)`}</td>
                  <td className="p-2 text-center">{item.quantity}</td>
                  <td className="p-2 text-right">${item.unitPrice.toFixed(2)}</td>
                  <td className="p-2 text-right">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
              {sale.items.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center p-4 text-gray-500">No se agregaron items a esta venta.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end my-8">
            <div className="w-1/3">
                <div className="flex justify-between">
                    <span className="font-semibold">Subtotal:</span>
                    <span>${sale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold">IVA:</span>
                    <span>${sale.taxTotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                    <span>Total:</span>
                    <span>${sale.total.toFixed(2)}</span>
                </div>
            </div>
        </section>

        <footer className="pt-8 mt-8 border-t-2 text-center text-gray-500">
            <p className="mt-8 text-xs">Gracias por su compra.</p>
        </footer>
      </div>
    );
  }
);

SalePrintLayout.displayName = 'SalePrintLayout';
