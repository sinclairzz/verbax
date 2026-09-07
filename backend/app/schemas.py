import re
from datetime import date
from typing import Literal
from pydantic import BaseModel, EmailStr, Field, field_validator
from .engine import CalculationInput
from .security import valid_cpf


class Register(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=10, max_length=128)
    aceite: Literal[True]

    @field_validator('nome')
    @classmethod
    def clean_name(cls, value):
        if len(value.strip()) < 2:
            raise ValueError('Informe seu nome.')
        return value.strip()


class Login(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1, max_length=128)


class GoogleLogin(BaseModel):
    access_token: str = Field(min_length=20, max_length=4096)
    aceite: Literal[True]


class Forgot(BaseModel):
    email: EmailStr


class Reset(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    senha: str = Field(min_length=10, max_length=128)


class NewCase(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    cpf: str
    cargo: str = Field(min_length=2, max_length=120)
    empregador: str = Field(default='', max_length=160)
    admissao: date
    demissao: date
    calculo: CalculationInput

    @field_validator('cpf')
    @classmethod
    def check_cpf(cls, value):
        value = re.sub(r'\D', '', value)
        if not valid_cpf(value):
            raise ValueError('Informe um CPF válido.')
        return value


class Checkout(BaseModel):
    plano: Literal['avulso', 'recorrente']
    caso_id: str | None = None


class Support(BaseModel):
    mensagem: str = Field(min_length=10, max_length=5000)
    tipo: Literal['suporte', 'privacidade'] = 'suporte'
