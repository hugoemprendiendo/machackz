
import React from 'react';
import type { Order, Client, AppSettings } from '@/lib/types';
import { format } from 'date-fns';

interface OrderReceptionLayoutProps {
  order: Order;
  client: Client;
  settings: AppSettings;
}

const ReceptionCopy: React.FC<OrderReceptionLayoutProps & { title: string }> = ({ order, client, settings, title }) => (
    <div className="p-4 border border-dashed border-gray-400 flex-1">
        <header className="text-center pb-4">
            <h1 className="text-xl font-bold text-gray-800">MacHackz</h1>
            <p className="text-gray-500 text-sm">Comprobante de Recepción de Equipo</p>
            <p className="font-bold text-lg mt-2">Orden: {order.id}</p>
        </header>

        <div className="text-xs space-y-2">
            <p><span className="font-semibold">Fecha:</span> {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</p>
            <p><span className="font-semibold">Cliente:</span> {client.name}</p>
            <p><span className="font-semibold">Teléfono:</span> {client.phone}</p>
            <p><span className="font-semibold">Equipo:</span> {order.deviceType} {order.brand} {order.deviceModel}</p>
            <p><span className="font-semibold">No. Serie:</span> {order.serialNumber || 'N/A'}</p>
            <p><span className="font-semibold">Cargador:</span> {order.hasCharger ? 'Si' : 'No'}</p>
            <div>
                <p className="font-semibold">Condición del equipo:</p>
                <p className="pl-2 text-gray-600">{order.condition || 'No especificada.'}</p>
            </div>
            <div>
                <p className="font-semibold">Problema Reportado:</p>
                <p className="pl-2 text-gray-600">{order.problemDescription}</p>
            </div>
        </div>

        <footer className="mt-8 text-center text-xs text-gray-500">
            <p className="mb-8" style={{ fontSize: '5pt', lineHeight: '1.2' }}>
                {settings.receptionNotes}
            </p>
            <div className="border-t border-gray-400 pt-2 w-3/4 mx-auto">
                <p>Firma del Cliente</p>
            </div>
        </footer>
        <p className="text-center font-bold mt-4">{title}</p>
    </div>
);


export const OrderReceptionLayout: React.FC<OrderReceptionLayoutProps> = ({ order, client, settings }) => {
  return (
      <div className="p-4 font-sans text-sm text-gray-900 bg-white">
        <div className="flex gap-4">
            <ReceptionCopy order={order} client={client} settings={settings} title="Copia Cliente" />
            <ReceptionCopy order={order} client={client} settings={settings} title="Copia Taller" />
        </div>
      </div>
  );
};
