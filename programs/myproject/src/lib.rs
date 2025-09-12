use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};

declare_id!("BjerAfpSVqNzVgTQPgDMmQsR19MuMHoLGiR7LsMHWFU");



#[program]
pub mod myproject {
    use super::*;
    pub fn create_token(ctx: Context<CreateToken>) -> Result<()> {
        Ok(())
    }
    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.artist_token_account.to_account_info(),
                    authority: ctx.accounts.artist.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }
}
#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(init, payer = artist, mint::decimals = 6, mint::authority = artist)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub artist: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub artist: Signer<'info>,

    #[account(mut)]
    pub artist_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
