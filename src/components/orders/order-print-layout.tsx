
import React from 'react';
import type { Order, Client, AppSettings } from '@/lib/types';
import { format } from 'date-fns';

interface OrderPrintLayoutProps {
  order: Order;
  client: Client;
  total: number;
  settings: AppSettings;
}

export const OrderPrintLayout = React.forwardRef<HTMLDivElement, OrderPrintLayoutProps>(
  ({ order, client, total, settings }, ref) => {
    const subtotal = order.parts.reduce((sum, part) => sum + part.unitPrice * part.quantity, 0);
    const taxTotal = order.parts.reduce((sum, part) => {
        const partTotal = part.unitPrice * part.quantity;
        const tax = partTotal * (part.taxRate / 100);
        return sum + tax;
    }, 0);

    return (
      <div ref={ref} className="p-8 font-sans text-sm text-gray-900">
        <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">MacHackz</h1>
            <p className="text-gray-500">Taller de Reparación de Computadoras</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">Orden de Servicio #{order.id}</h2>
            <p className="text-gray-600">Fecha: {format(new Date(order.createdAt), 'dd/MM/yyyy')}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8 my-8">
          <div>
            <h3 className="font-semibold text-gray-700 border-b pb-1 mb-2">Cliente</h3>
            <p className="font-bold">{client.name}</p>
            <p>{client.address}</p>
            <p>{client.phone}</p>
            <p>{client.email}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 border-b pb-1 mb-2">Dispositivo</h3>
            <p><span className="font-semibold">Tipo:</span> {order.deviceType}</p>
            <p><span className="font-semibold">Modelo:</span> {order.deviceModel}</p>
          </div>
        </section>

        <section className="my-8">
            <h3 className="font-semibold text-gray-700 border-b pb-1 mb-2">Detalles de la Reparación</h3>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <h4 className="font-semibold">Problema Reportado:</h4>
                    <p className="text-gray-600 pl-2">{order.problemDescription}</p>
                </div>
                <div>
                    <h4 className="font-semibold">Diagnóstico Técnico:</h4>
                    <p className="text-gray-600 pl-2">{order.diagnosis}</p>
                </div>
            </div>
        </section>

        <section className="my-8">
          <h3 className="font-semibold text-gray-700 border-b pb-1 mb-2">Partes y Costos</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Producto</th>
                <th className="p-2 text-center">Cantidad</th>
                <th className="p-2 text-right">Precio Unit.</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.parts.map((part) => (
                <tr key={part.itemId} className="border-b">
                  <td className="p-2">{part.name} {part.taxRate > 0 && `(IVA ${part.taxRate}%)`}</td>
                  <td className="p-2 text-center">{part.quantity}</td>
                  <td className="p-2 text-right">${part.unitPrice.toFixed(2)}</td>
                  <td className="p-2 text-right">${(part.unitPrice * part.quantity).toFixed(2)}</td>
                </tr>
              ))}
              {order.parts.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center p-4 text-gray-500">No se utilizaron partes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end my-8">
            <div className="w-1/3">
                <div className="flex justify-between">
                    <span className="font-semibold">Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold">IVA:</span>
                    <span>${taxTotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                </div>
            </div>
        </section>

        <footer className="pt-8 mt-8 border-t-2 text-center text-gray-500">
            <p className="mb-4">
                {settings.deliveryNotes}
            </p>
            <div className="grid grid-cols-2 gap-16 pt-12">
                <div className="border-t pt-2">
                    <p>Firma del Cliente</p>
                </div>
                <div className="border-t pt-2">
                    <p>Firma del Técnico</p>
                </div>
            </div>
            <p className="mt-8 text-xs">Gracias por su preferencia.</p>
        </footer>
      </div>
    );
  }
);

OrderPrintLayout.displayName = 'OrderPrintLayout';

    
