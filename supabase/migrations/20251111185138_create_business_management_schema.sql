/*
  # Business Management System Schema
  
  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `order_date` (date)
      - `customer_name` (text)
      - `product_description` (text)
      - `purchase_price` (decimal)
      - `sale_price` (decimal)
      - `profit` (decimal, calculated)
      - `status` (text: 'pendiente' or 'pagado')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `payments`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `user_id` (uuid, references auth.users)
      - `amount` (decimal)
      - `payment_date` (timestamptz)
      - `reference_number` (text)
      - `payment_image_url` (text)
      - `created_at` (timestamptz)
    
    - `notes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `note_text` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_name text NOT NULL,
  product_description text NOT NULL,
  purchase_price decimal(10,2) NOT NULL DEFAULT 0,
  sale_price decimal(10,2) NOT NULL DEFAULT 0,
  profit decimal(10,2) GENERATED ALWAYS AS (sale_price - purchase_price) STORED,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  payment_date timestamptz DEFAULT now(),
  reference_number text DEFAULT '',
  payment_image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL, -- Asegura que la transacción está ligada a un usuario
  amount numeric(10, 2) NOT NULL CHECK (amount > 0), -- Monto positivo de la transacción
  description text NOT NULL, -- Breve descripción o razón del gasto/inversión
  type transaction_type NOT NULL, -- Define si es 'inversion' o 'retiro'
  transaction_date timestamp with time zone DEFAULT now() NOT NULL
);
-- 1. CREACIÓN DE LA TABLA INVENTORY_ITEMS
CREATE TABLE public.inventory_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users (id) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,

    -- Campos de producto
    name text NOT NULL,
    sku text, -- Código de inventario (opcional)
    supplier text,

    -- Campos de gestión financiera y stock
    stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    unit_price numeric(10, 2) NOT NULL DEFAULT 0.00, -- Costo de Compra (Inversión unitaria)
    sale_price numeric(10, 2) NOT NULL DEFAULT 0.00, -- Precio de Venta unitario

    -- Aseguramos que los precios sean no negativos
    CONSTRAINT check_prices_positive CHECK (unit_price >= 0 AND sale_price >= 0)
);

CREATE TYPE transaction_type AS ENUM ('inversion', 'retiro');

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payments"
  ON payments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

  CREATE POLICY "Users can only view their own financial transactions"
  ON financial_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial transactions"
  ON financial_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can view their own inventory items"
ON public.inventory_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Política para que los usuarios puedan CREAR, ACTUALIZAR y ELIMINAR sus propios ítems
CREATE POLICY "Users can manage their own inventory items"
ON public.inventory_items FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_inventory_items_user_id ON public.inventory_items (user_id);