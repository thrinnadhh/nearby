import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PartnerInfoCard } from '@/components/PartnerInfoCard';

describe('PartnerInfoCard Tests', () => {
  const mockPartner = {
    name: 'John Doe',
    rating: 4.8,
    deliveries_count: 150,
    vehicle: 'Motorcycle',
    vehicle_number: 'KA-01-2345',
  };

  it('renders partner name', () => {
    const { getByText } = render(
      <PartnerInfoCard partner={mockPartner} />
    );
    expect(getByText('John Doe')).toBeTruthy();
  });

  it('displays partner rating', () => {
    const { getByText } = render(
      <PartnerInfoCard partner={mockPartner} />
    );
    expect(getByText('4.8')).toBeTruthy();
  });

  it('shows delivery count', () => {
    const { getByText } = render(
      <PartnerInfoCard partner={mockPartner} />
    );
    expect(getByText(/150 deliveries/)).toBeTruthy();
  });

  it('displays vehicle information', () => {
    const { getByText } = render(
      <PartnerInfoCard partner={mockPartner} />
    );
    expect(getByText('Motorcycle')).toBeTruthy();
  });

  it('shows masked vehicle number', () => {
    const { getByText } = render(
      <PartnerInfoCard partner={mockPartner} />
    );
    expect(getByText('KA-01-2345')).toBeTruthy();
  });

  it('renders without partner data gracefully', () => {
    const { getByText } = render(
      <PartnerInfoCard partner={undefined} />
    );
    expect(getByText(/Delivery partner information/i)).toBeTruthy();
  });

  it('calls onContact when contact button is pressed', () => {
    const onContactMock = jest.fn();
    const { getByText } = render(
      <PartnerInfoCard partner={mockPartner} onContact={onContactMock} />
    );

    const contactButton = getByText('Contact Delivery Partner');
    fireEvent.press(contactButton);
    expect(onContactMock).toHaveBeenCalled();
  });

  it('updates when partner data changes', () => {
    const { rerender, getByText, queryByText } = render(
      <PartnerInfoCard partner={mockPartner} />
    );

    expect(getByText('John Doe')).toBeTruthy();

    const newPartner = { ...mockPartner, name: 'Jane Smith' };
    rerender(<PartnerInfoCard partner={newPartner} />);

    expect(queryByText('John Doe')).toBeNull();
    expect(getByText('Jane Smith')).toBeTruthy();
  });

  it('handles zero rating', () => {
    const partnerWithZeroRating = { ...mockPartner, rating: 0 };
    const { getByText } = render(
      <PartnerInfoCard partner={partnerWithZeroRating} />
    );
    expect(getByText('0.0')).toBeTruthy();
  });

  it('formats rating to one decimal place', () => {
    const partnerWithDecimal = { ...mockPartner, rating: 4.876 };
    const { getByText } = render(
      <PartnerInfoCard partner={partnerWithDecimal} />
    );
    expect(getByText('4.9')).toBeTruthy();
  });

  it('shows default vehicle when not provided', () => {
    const partnerWithoutVehicle = { ...mockPartner, vehicle: undefined };
    const { getByText } = render(
      <PartnerInfoCard partner={partnerWithoutVehicle} />
    );
    expect(getByText('Bike')).toBeTruthy();
  });

  it('handles large delivery counts', () => {
    const partnerWithManyDeliveries = { ...mockPartner, deliveries_count: 5000 };
    const { getByText } = render(
      <PartnerInfoCard partner={partnerWithManyDeliveries} />
    );
    expect(getByText(/5000 deliveries/)).toBeTruthy();
  });
});
