const ShippingPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 to-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-900 md:text-4xl">
            Shipping Policy
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Learn about our shipping methods, delivery times, and charges
          </p>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Shipping Methods</h2>

            <div className="space-y-6">
              <div className="border-l-4 border-emerald-500 pl-6">
                <h3 className="text-lg font-semibold text-emerald-900">Standard Delivery</h3>
                <p className="mt-2 text-gray-600">
                  Our standard delivery service ensures your gifts arrive within 3-5 business days.
                  Perfect for planned celebrations and regular gifting needs.
                </p>
                <p className="mt-2 font-medium text-emerald-700">Delivery Time: 3-5 business days</p>
                <p className="mt-1 font-medium text-emerald-700">Shipping Cost: ₹99 (Free on orders above ₹999)</p>
              </div>

              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-emerald-900">Express Delivery</h3>
                <p className="mt-2 text-gray-600">
                  For urgent deliveries and last-minute surprises, our express service gets your
                  gifts delivered within 1-2 business days.
                </p>
                <p className="mt-2 font-medium text-emerald-700">Delivery Time: 1-2 business days</p>
                <p className="mt-1 font-medium text-emerald-700">Shipping Cost: ₹199 (Free on orders above ₹1499)</p>
              </div>

              <div className="border-l-4 border-purple-500 pl-6">
                <h3 className="text-lg font-semibold text-emerald-900">Same Day Delivery</h3>
                <p className="mt-2 text-gray-600">
                  Available in select cities for orders placed before 2 PM. Perfect for same-day
                  celebrations and emergency gifting needs.
                </p>
                <p className="mt-2 font-medium text-emerald-700">Delivery Time: Same day (before 8 PM)</p>
                <p className="mt-1 font-medium text-emerald-700">Shipping Cost: ₹299</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Shipping Information</h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-emerald-900 mb-3">Processing Time</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Orders are processed within 1-2 business hours</li>
                  <li>• Custom orders may take additional preparation time</li>
                  <li>• Order confirmation will be sent via email and SMS</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-emerald-900 mb-3">Delivery Areas</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Pan-India delivery available</li>
                  <li>• International shipping on request</li>
                  <li>• Remote areas may have extended delivery times</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-emerald-900 mb-3">Shipping Charges</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Free shipping on orders above ₹999</li>
                  <li>• Additional charges for remote locations</li>
                  <li>• COD charges may apply</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-emerald-900 mb-3">Tracking</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Real-time tracking updates via SMS and email</li>
                  <li>• Track your order using the order ID</li>
                  <li>• Customer support available 24/7</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Important Notes</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                • All delivery times are business days (Monday to Saturday, excluding public holidays).
              </p>
              <p>
                • We are not responsible for delays caused by natural disasters, strikes, or other
                unforeseen circumstances.
              </p>
              <p>
                • For perishable items like flowers and cakes, we recommend same-day or next-day delivery.
              </p>
              <p>
                • Delivery attempts are made up to 3 times. Additional attempts may incur extra charges.
              </p>
              <p>
                • Please ensure someone is available at the delivery address during business hours.
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Have questions about shipping?{" "}
              <a href="mailto:niyoragifts@gmail.com" className="font-medium text-emerald-600 hover:text-emerald-700">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicy;