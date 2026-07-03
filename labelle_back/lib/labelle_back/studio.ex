defmodule LabelleBack.Studio do
  use Ash.Domain, otp_app: :labelle_back, extensions: [AshAdmin.Domain, AshJsonApi.Domain]

  admin do
    show? true
  end

  json_api do
    authorize? true

    routes do
      base_route "/clients", LabelleBack.Studio.Client do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/professionals", LabelleBack.Studio.Professional do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/professional_services", LabelleBack.Studio.ProfessionalService do
        get :read
        index :read
        post :create
        delete :destroy
      end

      base_route "/services", LabelleBack.Studio.Service do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/appointments", LabelleBack.Studio.Appointment do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/products", LabelleBack.Studio.Product do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/promotions", LabelleBack.Studio.Promotion do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/transactions", LabelleBack.Studio.Transaction do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/payments", LabelleBack.Studio.Payment do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end
    end
  end

  resources do
    resource LabelleBack.Studio.Client
    resource LabelleBack.Studio.Professional
    resource LabelleBack.Studio.ProfessionalService
    resource LabelleBack.Studio.Service
    resource LabelleBack.Studio.Appointment
    resource LabelleBack.Studio.Product
    resource LabelleBack.Studio.Promotion
    resource LabelleBack.Studio.Transaction
    resource LabelleBack.Studio.Payment
  end
end
