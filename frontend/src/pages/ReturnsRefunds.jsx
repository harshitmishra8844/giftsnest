const ReturnsRefunds = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 to-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-900 md:text-4xl">
            Returns & Refunds
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Our commitment to your satisfaction with transparent return and refund policies
          </p>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Return Policy</h2>

            <div className="space-y-6">
              <div className="border-l-4 border-emerald-500 pl-6">
                <h3 className="text-lg font-semibold text-emerald-900">Eligibility for Returns</h3>
                <p className="mt-2 text-gray-600">
                  We accept returns within 7 days of delivery for most items, provided they are in
                  their original condition and packaging. Some items like perishable goods (flowers,
                  cakes) cannot be returned due to hygiene and safety reasons.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-emerald-900">Non-Returnable Items</h3>
                <ul className="mt-2 space-y-1 text-gray-600">
                  <li>• Perishable items (flowers, cakes, chocolates)</li>
                  <li>• Personalized or custom-made items</li>
                  <li>• Items damaged due to misuse or normal wear</li>
                  <li>• Items without original packaging and tags</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-6">
                <h3 className="text-lg font-semibold text-emerald-900">Return Process</h3>
                <div className="mt-2 space-y-2 text-gray-600">
                  <p>1. Contact our customer support within 7 days of delivery</p>
                  <p>2. Provide order details and reason for return</p>
                  <p>3. Our team will guide you through the return process</p>
                  <p>4. Pack the item securely in original packaging</p>
                  <p>5. Ship the item back to us (shipping charges may apply)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Refund Policy</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-emerald-900 mb-3">Refund Processing</h3>
                <p className="text-gray-600">
                  Once we receive and inspect your returned item, we will process your refund within
                  5-7 business days. Refunds will be issued to the original payment method.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold text-emerald-900 mb-2">Refund Timeline</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Credit/Debit Card: 5-7 business days</li>
                    <li>• UPI/Wallets: 1-3 business days</li>
                    <li>• Net Banking: 3-5 business days</li>
                    <li>• Cash on Delivery: 7-10 business days</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-emerald-900 mb-2">Refund Amount</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Full refund for defective items</li>
                    <li>• Partial refund for used items</li>
                    <li>• Shipping charges are non-refundable</li>
                    <li>• COD charges are non-refundable</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Exchange Policy</h2>

            <div className="space-y-4">
              <p className="text-gray-600">
                We offer hassle-free exchanges for size issues, color preferences, or if you received
                a different item than ordered. Exchanges are processed within 7 days of delivery.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-emerald-50 p-4">
                  <h4 className="font-semibold text-emerald-900 mb-2">Exchange Process</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Contact customer support</li>
                    <li>• Provide order and exchange details</li>
                    <li>• Receive exchange approval</li>
                    <li>• Return old item (we pay shipping)</li>
                    <li>• Receive new item</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="font-semibold text-emerald-900 mb-2">Exchange Charges</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Free for defective items</li>
                    <li>• ₹99 for size/color exchanges</li>
                    <li>• Full price difference if applicable</li>
                    <li>• No exchange for sale items</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Damaged or Defective Items</h2>

            <div className="space-y-4">
              <p className="text-gray-600">
                If you receive a damaged or defective item, please contact us immediately with
                photos of the item and packaging. We will arrange for a replacement or full refund
                at no extra cost to you.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Important</h4>
                <ul className="space-y-1 text-sm text-yellow-700">
                  <li>• Report damage within 24 hours of delivery</li>
                  <li>• Keep original packaging and all accessories</li>
                  <li>• Take clear photos from multiple angles</li>
                  <li>• Do not use damaged items before inspection</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help with returns or refunds?{" "}
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

export default ReturnsRefunds;